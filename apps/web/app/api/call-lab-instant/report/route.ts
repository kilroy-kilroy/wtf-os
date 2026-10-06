import { authorizeLab, grantGuest, reportLink, readLabJson, limitLab, sameOrigin, labFailure, LabError } from '@/lib/labs/access';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@repo/db/client';
import { getInstantReportById, incrementReportViews } from '@repo/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('id');

    if (!reportId) {
      return NextResponse.json(
        { error: 'Report ID required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get report
    const report = await getInstantReportById(supabase, reportId);

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    await authorizeLab('instant', reportId, null, searchParams.get('access_token'));

    // Increment view count (fire and forget)
    incrementReportViews(supabase, reportId).catch(console.error);

    // Return report data
    return NextResponse.json({
      success: true,
      report: {
        id: report.id,
        score: report.score,
        transcript: report.transcript,
        analysis: report.analysis,
        scenario_type: report.scenario_type,
        created_at: report.created_at,
        view_count: report.view_count,

      },
    });
  } catch (error) {
    const failure = labFailure(error); if (failure) return failure;
    console.error('Get report error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch report',

      },
      { status: 500 }
    );
  }
}
