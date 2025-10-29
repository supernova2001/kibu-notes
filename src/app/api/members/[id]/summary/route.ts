import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { timestamp } = await req.json();

  // Fetch all notes up to the given time
  const { data: notes, error } = await supabase
    .from("notes")
    .select("structured_json, raw_text, created_at")
    .eq("member_id", id)
    .lte("created_at", timestamp)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Supabase fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!notes || notes.length === 0) {
    return NextResponse.json({ summary: "No previous notes available." });
  }

  // Build the input text for summarization
  const fullText = notes
    .map((n) => n.structured_json?.summary || n.raw_text)
    .filter(Boolean)
    .join("\n");

  const prompt = `
You are an assistant helping summarize daily support notes for disability services.
Below are all the notes recorded so far in the day (up to the current time).
Write a brief, neutral "summary so far" paragraph describing observable behaviors, activities, and progress.
Avoid repetition and medical terms.

Notes:
${fullText}
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You write clear, compliant progress summaries." },
      { role: "user", content: prompt },
    ],
    temperature: 0.4,
  });

  const summary = completion.choices[0]?.message?.content?.trim() || "";

  return NextResponse.json({ summary });
}