import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import {
  CallLabReport,
  MarkdownReport,
  parseCallLabLiteMarkdown,
  generateCallLabLiteHTML,
  parseDiscoveryLabMarkdown,
  generateDiscoveryLabHTML,
  parseDiscoveryLabProMarkdown,
  generateDiscoveryLabProHTML,
  isDiscoveryLabMarkdown,
  isDiscoveryLabProMarkdown,
  htmlToPdf,
} from '@repo/pdf';
import React from 'react';

// Allow up to 60s for PDF generation (Puppeteer can be slow)
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { result, metadata, useHtmlPdf = true, format = 'pdf' } = body;

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

    if (isMarkdown) {
      try {
        // Check if this is a Discovery Lab report
        if (product === 'discovery-lab' || isDiscoveryLabMarkdown(result)) {
          // Check if it's Pro version
          if (tier === 'pro' || isDiscoveryLabProMarkdown(result)) {
            // Discovery Lab Pro
            const reportData = parseDiscoveryLabProMarkdown(result);
            reportData.date = metadata?.date || reportData.date;
            html = generateDiscoveryLabProHTML(reportData);
            filename = `discovery-lab-pro-${metadata?.prospectCompany?.replace(/\s+/g, '-').toLowerCase() || 'playbook'}-${Date.now()}.pdf`;
          } else {
            // Discovery Lab Lite
            const reportData = parseDiscoveryLabMarkdown(result);
            reportData.date = metadata?.date || reportData.date;
            html = generateDiscoveryLabHTML(reportData);
            filename = `discovery-lab-${metadata?.prospectCompany?.replace(/\s+/g, '-').toLowerCase() || 'guide'}-${Date.now()}.pdf`;
          }
        } else {
          // Call Lab - use existing logic
          const reportData = parseCallLabLiteMarkdown(result);
          html = generateCallLabLiteHTML(reportData);
          filename = `call-lab-${tier}-${Date.now()}.pdf`;
        }
      } catch (parseError) {
        console.error('Error generating HTML from markdown:', parseError);
        // html remains null, will use React PDF fallback below
      }
    }

    // If format=html requested, return the generated HTML directly
    // This is the client-side fallback path
    if (format === 'html') {
      if (html) {
        return new NextResponse(html, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
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
              details: puppeteerError instanceof Error ? puppeteerError.message : 'Unknown error',
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
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate PDF',
        fallback: 'html',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
