import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { CallLabReport, MarkdownReport } from '@repo/pdf';
import React from 'react';

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

    // Generate PDF with appropriate component
    const pdfBuffer = await renderToBuffer(
      isMarkdown
        ? React.createElement(MarkdownReport, { markdown: result, metadata })
        : React.createElement(CallLabReport, { result, metadata })
    );

    // Return PDF as download
    const filename = `call-lab-${metadata?.tier || 'report'}-${Date.now()}.pdf`;
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
