import { generateEmbedding } from "./embeddings";
import { getProgramsIndex } from "./pinecone";
import { supabaseServer } from "./supabase";

/**
 * Generate a text representation of a structured note for embedding.
 * Combines all relevant fields into a semantic-rich string.
 */
export function buildNoteTextForEmbedding(structuredNote: any): string {
  const parts: string[] = [];

  // Core activity information
  if (structuredNote.activityType) {
    parts.push(`Activity: ${structuredNote.activityType}`);
  }

  // Summary (most important semantic content)
  if (structuredNote.summary) {
    parts.push(structuredNote.summary);
  }

  // Mood and participation indicators
  if (structuredNote.mood) {
    parts.push(`Mood: ${structuredNote.mood}`);
  }
  if (structuredNote.participation) {
    parts.push(`Participation: ${structuredNote.participation}`);
  }
  if (structuredNote.promptsRequired) {
    parts.push(`Prompts required: ${structuredNote.promptsRequired}`);
  }

  // Follow-ups (future focus areas)
  if (structuredNote.followUps && Array.isArray(structuredNote.followUps)) {
    parts.push(`Follow-ups: ${structuredNote.followUps.join(", ")}`);
  }

  // Medications (can indicate health context)
  if (structuredNote.medications && Array.isArray(structuredNote.medications)) {
    const medNames = structuredNote.medications
      .map((m: any) => m.name)
      .filter(Boolean)
      .join(", ");
    if (medNames) {
      parts.push(`Medications: ${medNames}`);
    }
  }

  return parts.join(". ");
}

/**
 * Calculate trend scores from structured note data.
 * Returns normalized scores for mood, prompts, and participation.
 */
export function calculateTrendScores(structuredNote: any): {
  mood_score: number;
  prompt_score: number;
  participation_score: number;
} {
  // Mood scoring: Engaged=2, Calm=1, Neutral=0, Anxious=-1, Agitated=-2
  const moodMap: Record<string, number> = {
    engaged: 2,
    calm: 1,
    happy: 2,
    neutral: 0,
    anxious: -1,
    agitated: -2,
    frustrated: -1,
    withdrawn: -2,
  };
  const mood = (structuredNote.mood || "").toLowerCase();
  const mood_score = moodMap[mood] ?? 0;

  // Prompt scoring: None=0, Minimal=1, Moderate=2, Max=3
  const promptMap: Record<string, number> = {
    none: 0,
    minimal: 1,
    moderate: 2,
    max: 3,
    maximum: 3,
  };
  const prompts = (structuredNote.promptsRequired || "").toLowerCase();
  const prompt_score = promptMap[prompts] ?? 1;

  // Participation scoring: High=3, Medium=2, Low=1
  const participationMap: Record<string, number> = {
    high: 3,
    medium: 2,
    moderate: 2,
    low: 1,
  };
  const participation = (structuredNote.participation || "").toLowerCase();
  const participation_score = participationMap[participation] ?? 2;

  return { mood_score, prompt_score, participation_score };
}

/**
 * Store note embedding in Pinecone and metadata in Supabase.
 * 
 * @param noteId - The note ID from Supabase
 * @param memberId - The member ID
 * @param sessionDate - Session date/time
 * @param structuredNote - The structured note data
 * @returns The embedding vector and stored metadata
 */
export async function storeNoteEmbedding({
  noteId,
  memberId,
  sessionDate,
  structuredNote,
}: {
  noteId: string;
  memberId: string;
  sessionDate: string;
  structuredNote: any;
}): Promise<{ embedding: number[]; trendScores: any }> {
  try {
    // Build text for embedding
    const noteText = buildNoteTextForEmbedding(structuredNote);
    console.log(`[storeNoteEmbedding] Generated note text for embedding (${noteText.length} chars)`);

    // Generate embedding
    const embedding = await generateEmbedding(noteText);
    console.log(`[storeNoteEmbedding] Generated embedding vector (${embedding.length} dimensions)`);

    // Calculate trend scores
    const trendScores = calculateTrendScores(structuredNote);

    // Store in Pinecone - use a prefix to separate notes from programs
    const index = await getProgramsIndex();

    await index.upsert([
      {
        id: `note-${noteId}`, // Prefix with "note-" to distinguish from programs
        values: embedding,
        metadata: {
          type: "note", // Add type field for filtering
          note_id: noteId,
          member_id: memberId,
          session_date: sessionDate,
          activity_type: structuredNote.activityType || "",
          mood: structuredNote.mood || "",
          participation: structuredNote.participation || "",
          prompts_required: structuredNote.promptsRequired || "",
          mood_score: trendScores.mood_score,
          prompt_score: trendScores.prompt_score,
          participation_score: trendScores.participation_score,
          summary: structuredNote.summary || "",
          created_at: new Date().getTime(),
        },
      },
    ]);

    console.log(`[storeNoteEmbedding] ✅ Stored note embedding in Pinecone for note ${noteId}`);

    // Store metadata in Supabase (optional - for easier querying)
    // We can create a note_embeddings table or just use the notes table
    // For now, we'll store trend scores in the structured_json

    return { embedding, trendScores };
  } catch (error) {
    console.error("[storeNoteEmbedding] Error:", error);
    throw error;
  }
}

/**
 * Retrieve note embeddings for a member from the last N days.
 * Returns the embeddings and their metadata.
 * Falls back to fetching notes from Supabase and generating embeddings if Pinecone doesn't have them.
 */
export async function getMemberNoteEmbeddings({
  memberId,
  days = 21, // Default to 3 weeks
}: {
  memberId: string;
  days?: number;
}): Promise<Array<{ embedding: number[]; metadata: any }>> {
  try {
    const index = await getProgramsIndex();

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Try to fetch from Pinecone first
    try {
      const queryResponse = await index.query({
        vector: new Array(512).fill(0), // Dummy vector for metadata-only query
        topK: 100,
        includeMetadata: true,
        filter: {
          type: { $eq: "note" },
          member_id: { $eq: memberId },
          created_at: { $gte: cutoffDate.getTime() },
        },
      });

      const embeddings = (queryResponse.matches || [])
        .filter((match) => match.id?.startsWith("note-"))
        .map((match) => ({
          embedding: match.values || [],
          metadata: match.metadata || {},
        }));

      if (embeddings.length > 0) {
        console.log(`[getMemberNoteEmbeddings] Retrieved ${embeddings.length} note embeddings from Pinecone`);
        return embeddings;
      }
    } catch (pineconeError) {
      console.warn("[getMemberNoteEmbeddings] Pinecone query failed, falling back to Supabase:", pineconeError);
    }

    // Fallback: Fetch notes from Supabase and generate embeddings
    console.log(`[getMemberNoteEmbeddings] Fetching notes from Supabase for member ${memberId}`);
    const { data: notes, error } = await supabaseServer
      .from("notes")
      .select("id, member_id, session_date, structured_json, created_at")
      .eq("member_id", memberId)
      .gte("created_at", cutoffDate.toISOString())
      .order("created_at", { ascending: true });

    if (error || !notes || notes.length === 0) {
      console.log(`[getMemberNoteEmbeddings] No notes found in Supabase`);
      return [];
    }

    // Generate embeddings for notes that don't have them yet
    const embeddings: Array<{ embedding: number[]; metadata: any }> = [];
    for (const note of notes) {
      const structured = note.structured_json || {};
      const noteText = buildNoteTextForEmbedding(structured);
      const embedding = await generateEmbedding(noteText);
      const trendScores = calculateTrendScores(structured);

      embeddings.push({
        embedding,
        metadata: {
          type: "note",
          note_id: note.id,
          member_id: note.member_id,
          session_date: note.session_date,
          activity_type: structured.activityType || "",
          mood: structured.mood || "",
          participation: structured.participation || "",
          prompts_required: structured.promptsRequired || "",
          mood_score: trendScores.mood_score,
          prompt_score: trendScores.prompt_score,
          participation_score: trendScores.participation_score,
          summary: structured.summary || "",
          created_at: note.created_at ? new Date(note.created_at).getTime() : new Date().getTime(),
        },
      });

      // Store in Pinecone for future use (async, don't wait)
      index.upsert([
        {
          id: `note-${note.id}`,
          values: embedding,
          metadata: {
            type: "note",
            note_id: note.id,
            member_id: note.member_id,
            session_date: note.session_date,
            activity_type: structured.activityType || "",
            mood: structured.mood || "",
            participation: structured.participation || "",
            prompts_required: structured.promptsRequired || "",
            mood_score: trendScores.mood_score,
            prompt_score: trendScores.prompt_score,
            participation_score: trendScores.participation_score,
            summary: structured.summary || "",
            created_at: note.created_at ? new Date(note.created_at).getTime() : new Date().getTime(),
          },
        },
      ]).catch((err) => console.error(`Failed to store embedding for note ${note.id}:`, err));
    }

    console.log(`[getMemberNoteEmbeddings] Generated ${embeddings.length} embeddings from Supabase notes`);
    return embeddings;
  } catch (error) {
    console.error("[getMemberNoteEmbeddings] Error:", error);
    return [];
  }
}

/**
 * Calculate average embedding vector from multiple note embeddings.
 * This represents the member's "current progress vector" or trend.
 */
export function averageEmbeddings(embeddings: number[][]): number[] {
  if (embeddings.length === 0) {
    return new Array(512).fill(0);
  }

  const dimension = embeddings[0].length;
  const averaged = new Array(dimension).fill(0);

  for (const embedding of embeddings) {
    for (let i = 0; i < dimension; i++) {
      averaged[i] += embedding[i];
    }
  }

  // Normalize by count
  for (let i = 0; i < dimension; i++) {
    averaged[i] /= embeddings.length;
  }

  return averaged;
}

/**
 * Calculate average trend scores from multiple notes.
 */
export function averageTrendScores(
  trendScoresArray: Array<{ mood_score: number; prompt_score: number; participation_score: number }>
): {
  avg_mood_score: number;
  avg_prompt_score: number;
  avg_participation_score: number;
  trend_direction: "improving" | "stable" | "declining";
} {
  if (trendScoresArray.length === 0) {
    return {
      avg_mood_score: 0,
      avg_prompt_score: 0,
      avg_participation_score: 0,
      trend_direction: "stable",
    };
  }

  const totals = trendScoresArray.reduce(
    (acc, scores) => ({
      mood: acc.mood + scores.mood_score,
      prompt: acc.prompt + scores.prompt_score,
      participation: acc.participation + scores.participation_score,
    }),
    { mood: 0, prompt: 0, participation: 0 }
  );

  const count = trendScoresArray.length;
  const avg_mood_score = totals.mood / count;
  const avg_prompt_score = totals.prompt / count;
  const avg_participation_score = totals.participation / count;

  // Simple trend detection: compare recent vs older scores
  const recentCount = Math.min(7, Math.floor(count / 2));
  const olderCount = count - recentCount;

  if (recentCount > 0 && olderCount > 0) {
    const recentScores = trendScoresArray.slice(-recentCount);
    const olderScores = trendScoresArray.slice(0, olderCount);

    const recentAvg = {
      mood: recentScores.reduce((s, n) => s + n.mood_score, 0) / recentCount,
      participation: recentScores.reduce((s, n) => s + n.participation_score, 0) / recentCount,
    };
    const olderAvg = {
      mood: olderScores.reduce((s, n) => s + n.mood_score, 0) / olderCount,
      participation: olderScores.reduce((s, n) => s + n.participation_score, 0) / olderCount,
    };

    const moodImproving = recentAvg.mood > olderAvg.mood;
    const participationImproving = recentAvg.participation > olderAvg.participation;

    let trend_direction: "improving" | "stable" | "declining" = "stable";
    if (moodImproving && participationImproving) {
      trend_direction = "improving";
    } else if (!moodImproving && !participationImproving && recentAvg.mood < olderAvg.mood) {
      trend_direction = "declining";
    }
  }

  return {
    avg_mood_score: avg_mood_score,
    avg_prompt_score: avg_prompt_score,
    avg_participation_score: avg_participation_score,
    trend_direction: "stable",
  };
}

