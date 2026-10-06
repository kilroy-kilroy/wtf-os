import { exportMarkdown, exportHtml } from '@/lib/labs/export';
import { createServerClient } from '@repo/db/client';
import { authorizeLab, readLabJson, limitLab, labFailure, LabError } from '@/lib/labs/access';
import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import {
  CallLabReport,
  MarkdownReport,
  htmlToPdf,
} from '@repo/pdf';
import React from 'react';
import { alertPdfFallbackUsed } from '@/lib/slack';

// Allow up to 60s for PDF generation (Puppeteer can be slow)
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await readLabJson(request);
    const { useHtmlPdf = true, format = 'pdf' } = body;
    if (typeof body.reportId !== 'string') throw new LabError(400, 'A saved report ID is required.');
    const isDiscovery = body.metadata?.product === 'discovery-lab';
    const { data: saved } = await (createServerClient() as any).from(isDiscovery ? 'discovery_briefs' : 'call_scores').select('*').eq('id', body.reportId).maybeSingle();
    if (!saved) throw new LabError(404, 'Report not found.');
    await authorizeLab(isDiscovery ? 'discovery' : 'call', saved.id, saved.user_id);
    await limitLab(request, 'export');
    const result = exportMarkdown(saved.markdown_response || "");
    const metadata = { product: isDiscovery ? 'discovery-lab' as const : 'call-lab' as const, tier: saved.version === 'lite' ? 'lite' : 'pro', date: new Date(saved.created_at).toLocaleDateString(), prospectCompany: isDiscovery ? saved.target_company : '' };

    if (!result) {
      return NextResponse.json(
        { error: 'Missing result data' },
        { status: 400 }
      );
    }

    // Detect if result is markdown (string) or JSON (object with structured data)
    const isMarkdown = typeof result === 'string';

    // Detect product type from metadata or content
    const product = metadata?.product || 'call-lab';
    const tier = metadata?.tier || 'lite';

    // Generate HTML for the report (used by both pdf and html format modes)
    let html: string | null = null;
    let filename: string = `${product}-${tier}-${Date.now()}.pdf`;

    if (isMarkdown) html = exportHtml(result);

    // If format=html requested, return the generated HTML directly
    // This is the client-side fallback path
    if (format === 'html') {
      if (html) {
        return new NextResponse(html, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Security-Policy': "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:;",
            'Content-Disposition': 'attachment; filename=report.html',
            'Cache-Control': 'private, no-store',
          },
        });
      }
      return NextResponse.json(
        { error: 'Failed to generate HTML' },
        { status: 500 }
      );
    }

    // Generate PDF
    let pdfBuffer: Buffer;

    if (isMarkdown && useHtmlPdf && html) {
      try {
        // Convert HTML to PDF using Puppeteer
        pdfBuffer = await htmlToPdf(html);
      } catch (puppeteerError) {
        console.error('Puppeteer PDF generation failed, falling back to React PDF:', puppeteerError);
        // This path still returns 200 with a usable (but unbranded) PDF, which is why a
        // broken Chromium survived unnoticed in production. Make the downgrade audible.
        alertPdfFallbackUsed(
          `${product}/${tier}`,
          puppeteerError instanceof Error ? puppeteerError.message.split('\n')[0] : 'Unknown error'
        );

        // Fallback to legacy React PDF approach
        try {
          pdfBuffer = await renderToBuffer(
            React.createElement(MarkdownReport, { markdown: result, metadata }) as any
          );
          filename = `${product}-${tier}-${Date.now()}.pdf`;
        } catch (reactPdfError) {
          console.error('React PDF fallback also failed:', reactPdfError);
          return NextResponse.json(
            {
              error: 'PDF generation failed',
              fallback: 'html',

            },
            { status: 500 }
          );
        }
      }
    } else if (isMarkdown) {
      // Legacy: Use React PDF for markdown
      pdfBuffer = await renderToBuffer(
        React.createElement(MarkdownReport, { markdown: result, metadata }) as any
      );
      filename = `${product}-${tier}-${Date.now()}.pdf`;
    } else {
      // Legacy: Use React PDF for JSON results
      pdfBuffer = await renderToBuffer(
        React.createElement(CallLabReport, { result, metadata }) as any
      );
      filename = `call-lab-${tier}-${Date.now()}.pdf`;
    }

    // Return PDF as download
    return new NextResponse(pdfBuffer! as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const failure = labFailure(error); if (failure) return failure;
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate PDF',
        fallback: 'html',

      },
      { status: 500 }
    );
  }
}
