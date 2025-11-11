import { NextRequest, NextResponse } from "next/server";
import { extractKeywords } from "@/lib/keywordExtractor";
import { searchProgramsByKeywords, getProgramsIndex } from "@/lib/pinecone";
import { Program } from "@/components/ProgramSuggestions";
import { saveProgramRecommendations } from "@/lib/programRecommendations";

// Note: Using Node.js runtime instead of Edge because Pinecone client requires Node.js modules
// export const runtime = "edge";

/**
 * POST /api/programs/suggest
 * 
 * Suggests programs based on voice note content using RAG (Retrieval-Augmented Generation).
 * 
 * Request body:
 * {
 *   transcript: string,      // The voice note transcript
 *   summary?: string,        // Optional structured summary from the note
 *   memberId?: string,       // Member ID to link recommendations
 *   noteId?: string,         // Note ID to link recommendations (optional)
 *   sessionDate?: string     // Session date/time (ISO string, defaults to now)
 * }
 * 
 * Response:
 * {
 *   programs: Program[],      // Array of suggested programs with similarity scores
 *   keywords: string[]       // Extracted keywords used for search
 *   recommendationId?: string // ID of saved recommendation record (if saved)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { transcript, summary, memberId, noteId, sessionDate } = body;

    if (!transcript || typeof transcript !== "string" || transcript.trim().length === 0) {
      return NextResponse.json(
        { error: "transcript is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    // Combine transcript and summary for better keyword extraction
    const fullText = summary 
      ? `${transcript}\n\nSummary: ${summary}`
      : transcript;

    // Step 1: Extract keywords from the voice note
    console.log("Extracting keywords from voice note...");
    const keywords = await extractKeywords(fullText);
    console.log("Extracted keywords:", keywords);

    if (keywords.length === 0) {
      console.warn("No keywords extracted, returning empty suggestions");
      return NextResponse.json({
        programs: [],
        keywords: [],
      });
    }

    // Step 2: Search Pinecone for matching programs
    console.log("Searching Pinecone for matching programs...");
    let matches;
    
    try {
      matches = await searchProgramsByKeywords(keywords, 15);
      console.log(`Found ${matches.length} matches from Pinecone`);
    } catch (error) {
      console.error("Pinecone search error:", error);
      
      // If Pinecone is not configured or fails, return empty results
      // In production, you might want to fall back to a database search
      return NextResponse.json({
        programs: [],
        keywords,
        error: "Vector search temporarily unavailable",
      });
    }

    // Step 3: Transform Pinecone results to Program format
    const programs: Program[] = matches
      .map((match) => {
        const metadata = match.metadata || {};
        const score = match.score || 0;

        // Extract program data from metadata
        // Adjust these field names based on your Pinecone schema
        const program: Program = {
          id: match.id || metadata.id || String(Math.random()),
          category: metadata.category || "Other",
          name: metadata.name || metadata.title || "Unnamed Program",
          description: metadata.description || metadata.desc || "",
          similarity: score,
          link: metadata.link || metadata.url || `/programs/${match.id}`,
        };

        // Include life skills if available in metadata
        if (metadata.lifeSkills && Array.isArray(metadata.lifeSkills)) {
          // You can add this to the Program type if needed
          (program as any).lifeSkills = metadata.lifeSkills;
        }

        return program;
      })
      .filter((program) => program.name !== "Unnamed Program") // Filter out invalid results
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0)) // Sort by similarity
      .slice(0, 10); // Limit to top 10

    console.log(`Returning ${programs.length} program suggestions`);

    // Step 4: Save recommendations to database if memberId is provided
    let recommendationId: string | undefined;
    let saveError: string | undefined;
    
    if (!memberId) {
      console.warn("[POST /api/programs/suggest] No memberId provided - recommendations will not be saved to database");
    } else if (programs.length === 0) {
      console.warn("[POST /api/programs/suggest] No programs to save - recommendations will not be saved to database");
    } else {
      console.log(`[POST /api/programs/suggest] Attempting to save ${programs.length} recommendations for memberId: ${memberId}`);
      try {
        const saved = await saveProgramRecommendations({
          memberId,
          noteId: noteId || null,
          sessionDate: sessionDate || new Date().toISOString(),
          programs,
          keywords,
        });
        
        if (saved.id) {
          recommendationId = saved.id;
          console.log(`[POST /api/programs/suggest] ✅ Successfully saved recommendations with ID: ${recommendationId}`);
        } else if (saved.error) {
          saveError = saved.error;
          console.error(`[POST /api/programs/suggest] ❌ Failed to save recommendations: ${saveError}`);
        } else {
          saveError = "Unknown error - no ID or error message returned";
          console.error(`[POST /api/programs/suggest] ❌ Failed to save recommendations: ${saveError}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[POST /api/programs/suggest] ❌ Exception while saving recommendations:", errorMessage);
        saveError = errorMessage;
      }
    }

    return NextResponse.json({
      programs,
      keywords,
      recommendationId,
      ...(saveError && { saveError, warning: "Programs were suggested but could not be saved to database" }),
    });
  } catch (error) {
    console.error("Error in /api/programs/suggest:", error);
    return NextResponse.json(
      {
        error: "Failed to generate program suggestions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/programs/suggest
 * Health check endpoint to verify Pinecone connection
 */
export async function GET() {
  try {
    const index = await getProgramsIndex();
    const stats = await index.describeIndexStats();
    
    return NextResponse.json({
      status: "connected",
      indexStats: {
        totalVectors: stats.totalRecordCount || 0,
        dimension: stats.dimension || 0,
        indexFullness: stats.indexFullness || 0,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

