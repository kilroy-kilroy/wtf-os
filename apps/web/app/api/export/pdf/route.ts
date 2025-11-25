import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { CallLabReport } from '@repo/pdf';
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

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      React.createElement(CallLabReport, { result, metadata })
    );

    // Return PDF as download
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="call-lab-report-${Date.now()}.pdf"`,
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
