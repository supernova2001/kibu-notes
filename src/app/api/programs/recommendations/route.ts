import { NextRequest, NextResponse } from "next/server";
import { getProgramRecommendations } from "@/lib/programRecommendations";
import { Program } from "@/components/ProgramSuggestions";

/**
 * GET /api/programs/recommendations
 * 
 * Fetches stored program recommendations from the database for a member.
 * 
 * Query parameters:
 * - memberId: string (required) - Member ID to fetch recommendations for
 * - noteId?: string (optional) - Filter by specific note ID
 * - startDate?: string (optional) - Filter by start date (ISO string)
 * - endDate?: string (optional) - Filter by end date (ISO string)
 * - limit?: number (optional, default: 50) - Maximum number of recommendations to return
 * 
 * Response:
 * {
 *   recommendations: Array<{
 *     id: string,
 *     member_id: string,
 *     note_id: string | null,
 *     session_date: string,
 *     programs: Program[],
 *     keywords: string[],
 *     created_at: string
 *   }>,
 *   programs: Program[]  // Flattened array of all programs from all recommendations (most recent first)
 * }
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("memberId");
    const noteId = searchParams.get("noteId") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    if (!memberId) {
      return NextResponse.json(
        { error: "memberId query parameter is required" },
        { status: 400 }
      );
    }

    console.log(`[GET /api/programs/recommendations] Fetching recommendations for memberId: ${memberId}`, {
      noteId,
      startDate,
      endDate,
      limit,
    });

    const recommendations = await getProgramRecommendations({
      memberId,
      noteId,
      startDate,
      endDate,
      limit,
    });

    console.log(`[GET /api/programs/recommendations] Found ${recommendations.length} recommendation records`);

    if (recommendations.length === 0) {
      console.warn(`[GET /api/programs/recommendations] No recommendations found for memberId: ${memberId}`);
      return NextResponse.json({
        recommendations: [],
        programs: [],
        count: 0,
        message: "No recommendations found",
      });
    }

    // Extract and flatten all programs from all recommendations
    // Most recent recommendations first, then programs within each recommendation
    const allPrograms: Program[] = [];
    const programIdsSeen = new Set<string>();

    for (const rec of recommendations) {
      console.log(`[GET /api/programs/recommendations] Processing recommendation ${rec.id}, programs count: ${Array.isArray(rec.programs) ? rec.programs.length : 'not an array'}`);
      
      if (rec.programs && Array.isArray(rec.programs)) {
        for (const program of rec.programs) {
          // Ensure program has required fields and avoid duplicates
          if (program && program.id && !programIdsSeen.has(program.id)) {
            programIdsSeen.add(program.id);
            // Normalize program structure to match Program type
            const normalizedProgram: Program = {
              id: program.id,
              category: program.category || "Other",
              name: program.name || "Unnamed Program",
              description: program.description || "",
              similarity: program.similarity ?? undefined,
              link: program.link || `/programs/${program.id}`,
              ...(program.lifeSkills && { lifeSkills: program.lifeSkills }),
            };
            allPrograms.push(normalizedProgram);
          }
        }
      } else {
        console.warn(`[GET /api/programs/recommendations] Recommendation ${rec.id} has invalid programs field:`, typeof rec.programs);
      }
    }

    console.log(`[GET /api/programs/recommendations] Returning ${allPrograms.length} unique programs from ${recommendations.length} recommendations`);

    return NextResponse.json({
      recommendations,
      programs: allPrograms,
      count: allPrograms.length,
    });
  } catch (error) {
    console.error("[GET /api/programs/recommendations] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch program recommendations",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

