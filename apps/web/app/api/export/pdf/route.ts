import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import {
  CallLabReport,
  MarkdownReport,
  parseCallLabLiteMarkdown,
  generateCallLabLiteHTML,
  htmlToPdf,
} from '@repo/pdf';
import React from 'react';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { result, report, markdown, metadata, useHtmlPdf = true } = body;

    // Support both legacy 'result' and new 'report'/'markdown' params
    const content = report || result || markdown;

    if (!content) {
      return NextResponse.json(
        { error: 'Missing report data' },
        { status: 400 }
      );
    }

    // Detect content type
    const isMarkdown = typeof content === 'string';
    const isProReport = !isMarkdown && content.meta !== undefined;

    let pdfBuffer: Buffer;

    if (isMarkdown && useHtmlPdf) {
      // HTML/CSS approach for markdown reports (Lite)
      try {
        const reportData = parseCallLabLiteMarkdown(content);
        const html = generateCallLabLiteHTML(reportData);
        pdfBuffer = await htmlToPdf(html);
      } catch (parseError) {
        console.error('Error with HTML/CSS PDF generation, falling back to React PDF:', parseError);
        pdfBuffer = await renderToBuffer(
          React.createElement(MarkdownReport, { markdown: content, metadata }) as any
        );
      }
    } else if (isMarkdown) {
      // Legacy React PDF for markdown
      pdfBuffer = await renderToBuffer(
        React.createElement(MarkdownReport, { markdown: content, metadata }) as any
      );
    } else if (isProReport) {
      // Pro report - use structured CallLabReport with enhanced metadata
      const enhancedMetadata = {
        ...metadata,
        score: content.meta?.overallScore,
        tier: 'pro',
      };
      pdfBuffer = await renderToBuffer(
        React.createElement(CallLabReport, { result: content, metadata: enhancedMetadata }) as any
      );
    } else {
      // Legacy JSON result
      pdfBuffer = await renderToBuffer(
        React.createElement(CallLabReport, { result: content, metadata }) as any
      );
    }

    // Return PDF with descriptive filename
    const companyName = metadata?.prospectCompany || metadata?.company || 'report';
    const tier = metadata?.tier || 'lite';
    const filename = `call-lab-${tier}-${companyName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.pdf`;

    return new NextResponse(pdfBuffer as any, {
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
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
