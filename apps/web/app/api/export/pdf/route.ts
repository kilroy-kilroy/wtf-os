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
    const { result, metadata, useHtmlPdf = true } = body;

    if (!result) {
      return NextResponse.json(
        { error: 'Missing result data' },
        { status: 400 }
      );
    }

    // Detect if result is markdown (string) or JSON (object with structured data)
    const isMarkdown = typeof result === 'string';

    // Generate PDF with appropriate method
    let pdfBuffer: Buffer;

    if (isMarkdown && useHtmlPdf) {
      // NEW: Use HTML/CSS approach for markdown reports
      try {
        // Parse markdown to extract structured data
        const reportData = parseCallLabLiteMarkdown(result);

        // Generate HTML from template
        const html = generateCallLabLiteHTML(reportData);

        // Convert HTML to PDF
        pdfBuffer = await htmlToPdf(html);
      } catch (parseError) {
        console.error('Error with HTML/CSS PDF generation, falling back to React PDF:', parseError);

        // Fallback to legacy React PDF approach
        pdfBuffer = await renderToBuffer(
          React.createElement(MarkdownReport, { markdown: result, metadata }) as any
        );
      }
    } else if (isMarkdown) {
      // Legacy: Use React PDF for markdown
      pdfBuffer = await renderToBuffer(
        React.createElement(MarkdownReport, { markdown: result, metadata }) as any
      );
    } else {
      // Legacy: Use React PDF for JSON results
      pdfBuffer = await renderToBuffer(
        React.createElement(CallLabReport, { result, metadata }) as any
      );
    }

    // Return PDF as download
    const productName = metadata?.product === 'discovery-lab' ? 'discovery-lab' : 'call-lab';
    const filename = `${productName}-${metadata?.tier || 'report'}-${Date.now()}.pdf`;
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
