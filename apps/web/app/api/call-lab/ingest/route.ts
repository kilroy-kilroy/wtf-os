import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge"; // Run on Vercel Edge Runtime

export async function POST(req: Request) {
  try {
    // --- Parse incoming JSON ----------------------------------------------
    const body = await req.json();

    const { report, metadata } = body || {};

    if (!report || !metadata) {
      return NextResponse.json(
        { error: "Missing `report` or `metadata` in payload." },
        { status: 400 }
      );
    }

    // --- Validate minimal required metadata -------------------------------
    if (!metadata.agent || !["lite", "pro"].includes(metadata.agent)) {
      return NextResponse.json(
        { error: "Invalid metadata.agent; must be 'lite' or 'pro'." },
        { status: 400 }
      );
    }

    if (!metadata.version) {
      return NextResponse.json(
        { error: "Missing metadata.version." },
        { status: 400 }
      );
    }

    if (!metadata.createdAt) {
      return NextResponse.json(
        { error: "Missing metadata.createdAt (ISO string)." },
        { status: 400 }
      );
    }

    // --- Initialize Supabase client ---------------------------------------
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // required for inserts server-side
      {
        auth: { persistSession: false }
      }
    );

    // --- Prepare row object for call_lab_reports table ---------------------
    // Handle both flat (Lite) and nested (Pro) report structures
    const isPro = metadata.agent === 'pro' && report.meta;

    const row = {
      user_id: metadata.userId || null,
      buyer_name: metadata.buyerName || "",
      company_name: metadata.companyName || "",
      overall_score: isPro ? (report.meta.overallScore ?? null) : (report.overallScore ?? null),
      trust_velocity: isPro ? (report.meta.trustVelocity ?? null) : (report.trustVelocity ?? null),
      agenda_control: isPro ? (report.scores?.narrativeControl ?? null) : (report.agendaControl ?? null),
      pattern_density: isPro ? (report.patterns?.length ?? 0) * 10 : (report.patternDensity ?? null),
      primary_pattern: isPro ? (report.patterns?.[0]?.patternName ?? "") : (report.primaryPattern ?? ""),
      improvement_highlight: isPro ? (report.nextSteps?.actions?.[0] ?? "") : (report.fixThisFirst ?? ""),
      full_report: report,
      created_at: metadata.createdAt,
      agent: metadata.agent,
      version: metadata.version,
      call_id: metadata.callId || "",
      transcript: metadata.transcript || ""
    };

    // --- Insert into Supabase ----------------------------------------------
    const { data, error } = await supabase
      .from("call_lab_reports")
      .insert(row)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        {
          error: "Supabase insert failed.",
          details: error.message
        },
        { status: 500 }
      );
    }

    // --- Success -----------------------------------------------------------
    return NextResponse.json(
      {
        status: "ok",
        id: data.id,
        saved: true,
        record: data
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: "Unexpected error in ingestion route.",
        details: message
      },
      { status: 500 }
    );
  }
}
