import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

/**
 * GET /api/programs/test-connection
 * 
 * Test endpoint to verify Supabase connection and table access
 */
export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Test basic connection
    const { data, error } = await supabaseServer
      .from("program_recommendations")
      .select("id, member_id, created_at")
      .limit(1);

    return NextResponse.json({
      success: true,
      config: {
        hasUrl: !!supabaseUrl,
        hasServiceKey,
        hasAnonKey,
        usingServiceKey: hasServiceKey,
      },
      connection: {
        connected: !error,
        error: error ? {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        } : null,
      },
      testQuery: {
        recordCount: data?.length || 0,
        sampleRecord: data?.[0] || null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

