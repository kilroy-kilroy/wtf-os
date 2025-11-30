import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

// Pattern categories
type PatternCategory =
  | "rapport"
  | "problem_depth"
  | "decision_model"
  | "narrative"
  | "delivery"
  | "positioning"
  | "followup"
  | "scope_alignment";

type PatternSeverity = "low" | "medium" | "high" | "critical";

type CompatibleTool = "calllab" | "discoverylab" | "anglelab" | "contentlab" | "proposalbuilder";

interface Pattern {
  pattern_id?: string;
  name: string;
  category: PatternCategory;
  subcategory?: string;
  definition: string;
  indicators?: string[];
  examples?: string[];
  recommended_fix?: string;
  severity?: PatternSeverity;
  compatible_tools?: CompatibleTool[];
  version?: number;
}

interface PatternFilters {
  category?: PatternCategory;
  subcategory?: string;
  severity?: PatternSeverity;
  compatible_tools?: CompatibleTool | CompatibleTool[];
  name?: string;
}

type PatternAction =
  | { action: "upsert_pattern"; pattern: Pattern }
  | { action: "get_patterns"; filters?: PatternFilters }
  | { action: "update_pattern"; pattern_id: string; updates: Partial<Pattern> }
  | { action: "batch_insert"; patterns: Pattern[] }
  | { action: "delete_pattern"; pattern_id: string };

export async function POST(req: Request) {
  try {
    const body: PatternAction = await req.json();

    if (!body.action) {
      return NextResponse.json(
        { error: "Missing `action` in payload." },
        { status: 400 }
      );
    }

    // Initialize Supabase with service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    switch (body.action) {
      // ─────────────────────────────────────────────────────────────────────
      // UPSERT PATTERN
      // ─────────────────────────────────────────────────────────────────────
      case "upsert_pattern": {
        if (!body.pattern || !body.pattern.name || !body.pattern.category || !body.pattern.definition) {
          return NextResponse.json(
            { error: "Pattern must include name, category, and definition." },
            { status: 400 }
          );
        }

        const { data, error } = await supabase
          .from("patterns")
          .upsert({
            ...body.pattern,
            version: body.pattern.version || 1,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "pattern_id",
          })
          .select()
          .single();

        if (error) {
          return NextResponse.json(
            { error: "Failed to upsert pattern.", details: error.message },
            { status: 500 }
          );
        }

        return NextResponse.json({
          status: "ok",
          action: "upsert_pattern",
          pattern: data,
        }, { status: 201 });
      }

      // ─────────────────────────────────────────────────────────────────────
      // GET PATTERNS
      // ─────────────────────────────────────────────────────────────────────
      case "get_patterns": {
        let query = supabase.from("patterns").select("*");

        const filters = body.filters || {};

        if (filters.category) {
          query = query.eq("category", filters.category);
        }

        if (filters.subcategory) {
          query = query.eq("subcategory", filters.subcategory);
        }

        if (filters.severity) {
          query = query.eq("severity", filters.severity);
        }

        if (filters.name) {
          query = query.ilike("name", `%${filters.name}%`);
        }

        if (filters.compatible_tools) {
          // Filter by compatible_tools array contains
          const tools = Array.isArray(filters.compatible_tools)
            ? filters.compatible_tools
            : [filters.compatible_tools];
          query = query.contains("compatible_tools", tools);
        }

        const { data, error } = await query.order("name", { ascending: true });

        if (error) {
          return NextResponse.json(
            { error: "Failed to fetch patterns.", details: error.message },
            { status: 500 }
          );
        }

        return NextResponse.json({
          status: "ok",
          action: "get_patterns",
          count: data?.length || 0,
          patterns: data || [],
        });
      }

      // ─────────────────────────────────────────────────────────────────────
      // UPDATE PATTERN
      // ─────────────────────────────────────────────────────────────────────
      case "update_pattern": {
        if (!body.pattern_id) {
          return NextResponse.json(
            { error: "Missing pattern_id for update." },
            { status: 400 }
          );
        }

        if (!body.updates || Object.keys(body.updates).length === 0) {
          return NextResponse.json(
            { error: "No updates provided." },
            { status: 400 }
          );
        }

        const { data, error } = await supabase
          .from("patterns")
          .update({
            ...body.updates,
            updated_at: new Date().toISOString(),
          })
          .eq("pattern_id", body.pattern_id)
          .select()
          .single();

        if (error) {
          return NextResponse.json(
            { error: "Failed to update pattern.", details: error.message },
            { status: 500 }
          );
        }

        return NextResponse.json({
          status: "ok",
          action: "update_pattern",
          pattern: data,
        });
      }

      // ─────────────────────────────────────────────────────────────────────
      // BATCH INSERT
      // ─────────────────────────────────────────────────────────────────────
      case "batch_insert": {
        if (!body.patterns || !Array.isArray(body.patterns) || body.patterns.length === 0) {
          return NextResponse.json(
            { error: "patterns must be a non-empty array." },
            { status: 400 }
          );
        }

        // Validate each pattern has required fields
        for (const pattern of body.patterns) {
          if (!pattern.name || !pattern.category || !pattern.definition) {
            return NextResponse.json(
              { error: `Each pattern must include name, category, and definition. Missing in: ${pattern.name || 'unnamed'}` },
              { status: 400 }
            );
          }
        }

        const patternsWithDefaults = body.patterns.map(p => ({
          ...p,
          version: p.version || 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        const { data, error } = await supabase
          .from("patterns")
          .insert(patternsWithDefaults)
          .select();

        if (error) {
          return NextResponse.json(
            { error: "Failed to batch insert patterns.", details: error.message },
            { status: 500 }
          );
        }

        return NextResponse.json({
          status: "ok",
          action: "batch_insert",
          inserted: data?.length || 0,
          patterns: data,
        }, { status: 201 });
      }

      // ─────────────────────────────────────────────────────────────────────
      // DELETE PATTERN
      // ─────────────────────────────────────────────────────────────────────
      case "delete_pattern": {
        if (!body.pattern_id) {
          return NextResponse.json(
            { error: "Missing pattern_id for deletion." },
            { status: 400 }
          );
        }

        const { error } = await supabase
          .from("patterns")
          .delete()
          .eq("pattern_id", body.pattern_id);

        if (error) {
          return NextResponse.json(
            { error: "Failed to delete pattern.", details: error.message },
            { status: 500 }
          );
        }

        return NextResponse.json({
          status: "ok",
          action: "delete_pattern",
          deleted: body.pattern_id,
        });
      }

      // ─────────────────────────────────────────────────────────────────────
      // UNKNOWN ACTION
      // ─────────────────────────────────────────────────────────────────────
      default:
        return NextResponse.json(
          { error: `Unknown action: ${(body as { action: string }).action}` },
          { status: 400 }
        );
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Unexpected error in patterns route.", details: message },
      { status: 500 }
    );
  }
}

// GET endpoint for simple pattern retrieval
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    let query = supabase.from("patterns").select("*");

    // Apply filters from query params
    const category = searchParams.get("category");
    const severity = searchParams.get("severity");
    const tool = searchParams.get("tool");

    if (category) query = query.eq("category", category);
    if (severity) query = query.eq("severity", severity);
    if (tool) query = query.contains("compatible_tools", [tool]);

    const { data, error } = await query.order("name", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch patterns.", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "ok",
      count: data?.length || 0,
      patterns: data || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Unexpected error fetching patterns.", details: message },
      { status: 500 }
    );
  }
}
