import { NextRequest, NextResponse } from "next/server";
import {
  getMemberNoteEmbeddings,
  averageEmbeddings,
  averageTrendScores,
} from "@/lib/noteEmbeddings";
import { searchPrograms } from "@/lib/pinecone";
import { Program } from "@/components/ProgramSuggestions";
import OpenAI from "openai";

// Note: Using Node.js runtime because Pinecone and OpenAI require Node.js modules
// export const runtime = "edge"; // Cannot use edge runtime

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * GET /api/programs/adaptive
 * 
 * Generates adaptive program recommendations based on member's recent note history
 * using semantic search (RAG) and trend analysis.
 * 
 * Query parameters:
 * - memberId: string (required) - Member ID
 * - days?: number (optional, default: 21) - Number of days to look back
 * - topK?: number (optional, default: 10) - Number of recommendations to return
 * 
 * Response:
 * {
 *   recommendations: Program[],
 *   insights: {
 *     trend_direction: "improving" | "stable" | "declining",
 *     avg_mood_score: number,
 *     avg_participation_score: number,
 *     focus_areas: string[],
 *     ai_recommendation: string
 *   },
 *   context: {
 *     notes_analyzed: number,
 *     time_period_days: number
 *   }
 * }
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("memberId");
    const days = parseInt(searchParams.get("days") || "21", 10);
    const topK = parseInt(searchParams.get("topK") || "10", 10);

    if (!memberId) {
      return NextResponse.json(
        { error: "memberId query parameter is required" },
        { status: 400 }
      );
    }

    console.log(`[GET /api/programs/adaptive] Generating adaptive recommendations for memberId: ${memberId}, days: ${days}`);

    // Step 1: Retrieve note embeddings for the member
    const noteEmbeddings = await getMemberNoteEmbeddings({ memberId, days });

    if (noteEmbeddings.length === 0) {
      return NextResponse.json({
        recommendations: [],
        insights: {
          trend_direction: "stable",
          avg_mood_score: 0,
          avg_participation_score: 0,
          focus_areas: [],
          ai_recommendation: "Not enough historical data available. Add more notes to get personalized recommendations.",
        },
        context: {
          notes_analyzed: 0,
          time_period_days: days,
        },
      });
    }

    // Step 2: Calculate average embedding (member's progress vector)
    const embeddings = noteEmbeddings.map((ne) => ne.embedding).filter((e) => e.length > 0);
    const progressVector = averageEmbeddings(embeddings);
    console.log(`[GET /api/programs/adaptive] Calculated progress vector from ${embeddings.length} notes`);

    // Step 3: Calculate trend scores
    const trendScores = noteEmbeddings.map((ne) => ({
      mood_score: ne.metadata.mood_score || 0,
      prompt_score: ne.metadata.prompt_score || 0,
      participation_score: ne.metadata.participation_score || 0,
    }));
    const avgTrends = averageTrendScores(trendScores);
    console.log(`[GET /api/programs/adaptive] Trend analysis:`, avgTrends);

    // Step 4: Search programs using the progress vector (semantic search)
    const programMatches = await searchPrograms(progressVector, topK * 2); // Get more for filtering

    // Step 5: Transform to Program format and calculate similarity
    const programs: Program[] = programMatches
      .map((match) => {
        const metadata = match.metadata || {};
        const score = match.score || 0;

        // Ensure all values are properly typed as strings
        const id = String(match.id || metadata.id || Math.random());
        const category = String(metadata.category || "Other");
        const name = String(metadata.name || metadata.title || "Unnamed Program");
        const description = String(metadata.description || metadata.desc || "");
        const link = String(metadata.link || metadata.url || `/programs/${match.id}`);

        const program: Program = {
          id,
          category,
          name,
          description,
          similarity: score,
          link,
        };

        // Include lifeSkills if available (as an optional property)
        if (metadata.lifeSkills && Array.isArray(metadata.lifeSkills)) {
          (program as any).lifeSkills = metadata.lifeSkills;
        }

        return program;
      })
      .filter((program) => program.name !== "Unnamed Program")
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      .slice(0, topK);

    console.log(`[GET /api/programs/adaptive] Found ${programs.length} program recommendations`);

    // Step 6: Extract focus areas from top programs
    const focusAreas = Array.from(
      new Set(programs.map((p) => p.category).filter(Boolean))
    ).slice(0, 5);

    // Step 7: Generate AI recommendation text
    const recentNotes = noteEmbeddings.slice(-5).map((ne) => ({
      activity: ne.metadata.activity_type,
      mood: ne.metadata.mood,
      participation: ne.metadata.participation,
      summary: ne.metadata.summary,
    }));

    const aiRecommendation = await generateAIRecommendation({
      memberId,
      recentNotes,
      programs,
      trendDirection: avgTrends.trend_direction,
      avgMoodScore: avgTrends.avg_mood_score,
      avgParticipationScore: avgTrends.avg_participation_score,
    });

    return NextResponse.json({
      recommendations: programs,
      insights: {
        trend_direction: avgTrends.trend_direction,
        avg_mood_score: avgTrends.avg_mood_score,
        avg_participation_score: avgTrends.avg_participation_score,
        avg_prompt_score: avgTrends.avg_prompt_score,
        focus_areas: focusAreas,
        ai_recommendation: aiRecommendation,
      },
      context: {
        notes_analyzed: noteEmbeddings.length,
        time_period_days: days,
      },
    });
  } catch (error) {
    console.error("[GET /api/programs/adaptive] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate adaptive recommendations",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Generate AI-powered recommendation text based on trends and programs.
 */
async function generateAIRecommendation({
  memberId,
  recentNotes,
  programs,
  trendDirection,
  avgMoodScore,
  avgParticipationScore,
}: {
  memberId: string;
  recentNotes: any[];
  programs: Program[];
  trendDirection: string;
  avgMoodScore: number;
  avgParticipationScore: number;
}): Promise<string> {
  try {
    const topPrograms = programs.slice(0, 5).map((p) => p.name).join(", ");
    const recentActivities = recentNotes
      .map((n) => n.activity)
      .filter(Boolean)
      .join(", ");

    const prompt = `You are an AI assistant helping caregivers choose appropriate programs for disability services participants.

Based on the following analysis:
- Recent activities: ${recentActivities || "Various activities"}
- Trend direction: ${trendDirection}
- Average mood score: ${avgMoodScore.toFixed(1)} (scale: -2 to 2)
- Average participation score: ${avgParticipationScore.toFixed(1)} (scale: 1 to 3)
- Top recommended programs: ${topPrograms}

Generate a brief, actionable recommendation (2-3 sentences) that:
1. Acknowledges the current progress/trend
2. Suggests which programs to focus on next
3. Provides context on why these programs are recommended

Be encouraging, specific, and professional.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that provides clear, actionable recommendations for disability services program selection.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    return completion.choices[0]?.message?.content?.trim() || "Consider exploring the recommended programs based on recent progress.";
  } catch (error) {
    console.error("[generateAIRecommendation] Error:", error);
    return "Based on recent notes, the recommended programs above align with current progress and focus areas.";
  }
}

