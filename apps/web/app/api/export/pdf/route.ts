import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { CallLabReport, MarkdownReport } from '@repo/pdf';
import React from 'react';

// Check if running on Vercel (where Chromium/Puppeteer doesn't work)
const isVercel = !!process.env.VERCEL;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { result, metadata } = body;

    if (!result) {
      return NextResponse.json(
        { error: 'Missing result data' },
        { status: 400 }
      );
    }

    // Detect if result is markdown (string) or JSON (object with structured data)
    const isMarkdown = typeof result === 'string';

    // Generate PDF using React PDF (works on Vercel serverless)
    let pdfBuffer: Uint8Array;

    if (isMarkdown) {
      // Use React PDF for markdown reports
      const element = React.createElement(MarkdownReport, {
        markdown: result,
        metadata,
      });
      pdfBuffer = await renderToBuffer(element as React.ReactElement);
    } else {
      // Use React PDF for JSON results (legacy Call Lab)
      const element = React.createElement(CallLabReport, {
        result,
        metadata,
      });
      pdfBuffer = await renderToBuffer(element as React.ReactElement);
    }

    // Return PDF as download
    const productName =
      metadata?.product === 'discovery-lab' ? 'discovery-lab' : 'call-lab';
    const filename = `${productName}-${metadata?.tier || 'report'}-${Date.now()}.pdf`;

    return new NextResponse(pdfBuffer, {
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
