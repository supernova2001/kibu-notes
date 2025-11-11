import { supabaseServer } from "./supabase";
import { Program } from "@/components/ProgramSuggestions";

/**
 * Save program recommendations to Supabase.
 * 
 * Schema for program_recommendations table:
 * - id: uuid (primary key, auto-generated)
 * - member_id: uuid (references members(id))
 * - note_id: uuid (references notes(id), nullable - recommendations can exist without a note)
 * - session_date: timestamptz (date/time when recommendations were generated)
 * - programs: jsonb (array of recommended programs with their details)
 * - keywords: text[] (array of keywords used for the search)
 * - created_at: timestamptz (default now())
 */
export async function saveProgramRecommendations({
  memberId,
  noteId,
  sessionDate,
  programs,
  keywords,
}: {
  memberId: string;
  noteId?: string | null;
  sessionDate: string;
  programs: Program[];
  keywords: string[];
}): Promise<{ id: string; error?: string }> {
  try {
    console.log(`[saveProgramRecommendations] Attempting to save recommendations:`, {
      memberId,
      noteId: noteId || 'null',
      sessionDate,
      programsCount: programs.length,
      keywordsCount: keywords.length,
    });

    // Prepare the programs data for storage
    const programsData = programs.map((program) => ({
      id: program.id,
      category: program.category,
      name: program.name,
      description: program.description || null,
      similarity: program.similarity || null,
      link: program.link || null,
      lifeSkills: (program as any).lifeSkills || null,
    }));

    const { data, error } = await supabaseServer
      .from("program_recommendations")
      .insert([
        {
          member_id: memberId,
          note_id: noteId || null,
          session_date: sessionDate,
          programs: programsData,
          keywords: keywords,
        },
      ])
      .select("id")
      .single();

    if (error) {
      console.error("[saveProgramRecommendations] Supabase error:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      // Return error info so API can include it in response
      return { id: '', error: error.message };
    }

    if (!data || !data.id) {
      console.error("[saveProgramRecommendations] No data returned from insert");
      return { id: '', error: 'No data returned from database insert' };
    }

    console.log(`[saveProgramRecommendations] Successfully saved recommendation with ID: ${data.id}`);
    return { id: data.id };
  } catch (error) {
    console.error("[saveProgramRecommendations] Exception caught:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Return error info to provide more context
    return { id: '', error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get program recommendations for a member, optionally filtered by date or note.
 */
export async function getProgramRecommendations({
  memberId,
  noteId,
  startDate,
  endDate,
  limit = 50,
}: {
  memberId: string;
  noteId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  try {
    // Check if Supabase is configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log("[getProgramRecommendations] Supabase config check:", {
      hasUrl: !!supabaseUrl,
      hasServiceKey,
      usingServiceKey: hasServiceKey,
      memberId,
    });

    if (!supabaseUrl) {
      console.error("[getProgramRecommendations] NEXT_PUBLIC_SUPABASE_URL is not set!");
      throw new Error("Supabase URL is not configured");
    }

    let query = supabaseServer
      .from("program_recommendations")
      .select("*")
      .eq("member_id", memberId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (noteId) {
      query = query.eq("note_id", noteId);
    }

    if (startDate) {
      // Filter by session_date (timestamptz) - greater than or equal to start date
      // Ensure we're using the exact timestamp for start of day
      query = query.gte("session_date", startDate);
    }

    if (endDate) {
      // Filter by session_date (timestamptz) - less than or equal to end date
      // Ensure we're using the exact timestamp for end of day
      query = query.lte("session_date", endDate);
    }

    // Additional: Also filter by date using created_at if session_date filtering isn't working
    // This is a fallback to ensure we get recommendations from the right date
    // Note: We're primarily using session_date, but created_at can help if session_date has timezone issues

    console.log("[getProgramRecommendations] Query filters:", {
      memberId,
      noteId: noteId || 'none',
      startDate: startDate || 'none',
      endDate: endDate || 'none',
      limit,
    });

    const { data, error } = await query;

    if (error) {
      console.error("[getProgramRecommendations] Supabase query error:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      throw error;
    }

    console.log(`[getProgramRecommendations] Successfully fetched ${data?.length || 0} recommendations`);
    return data || [];
  } catch (error) {
    console.error("[getProgramRecommendations] Exception:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return [];
  }
}

