import { NextRequest, NextResponse } from "next/server";
import { RawNoteInput } from "@/lib/schemas";
import { systemPrompt, userPrompt, safeParseLLMJson } from "@/lib/llm";
import { supabase } from "@/lib/supabase";
import { extractMedications } from "@/lib/llmMedicationExtractor"; // ✅ added
import { detectLanguage, translateTo } from "@/lib/translate";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = RawNoteInput.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const { memberName, memberId, activityType, sessionDate, freeText, language } = parsed.data;

  // Detect source language and get English text for processing
  const detected = language || (await detectLanguage(freeText));
  const freeTextEn = detected === "es" ? await translateTo(freeText, "en") : freeText;

  if (!process.env.OPENAI_API_KEY) {
    const finalMemberName = memberName || "Unknown";
    const fallback = {
      memberName: finalMemberName,
      activityType,
      sessionDate,
      mood: "Engaged",
      promptsRequired: "Minimal",
      participation: "High",
      summary: `${finalMemberName} participated in ${activityType} on ${sessionDate}. They engaged well with minimal prompts, followed instructions, and demonstrated improved independence in targeted tasks. No safety concerns noted. Staff provided positive reinforcement and gentle cues.`,
      followUps: [
        "Continue with next-level modules",
        "Add 5-minute warm-up routine",
      ],
      medications: []
    };

    await saveNoteToDB({
      memberId: memberId,
      memberName: finalMemberName,
      activityType,
      sessionDate,
      freeText,
      structuredNote: fallback,
    });

    return NextResponse.json(fallback);
  }

  const resp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt(freeTextEn) },
      ],
    }),
  });

  const data = await resp.json();
  const text = data?.output?.[0]?.content?.[0]?.text || data?.output_text || "";
  const parsedJson = safeParseLLMJson(text);

  if (!parsedJson) {
    console.error("Invalid LLM format:", text);
    return NextResponse.json(
      { error: "LLM format error", raw: text },
      { status: 502 }
    );
  }

  const medications = await extractMedications(freeTextEn);
  parsedJson.medications = medications;

  // Attach i18n: store raw and translated summary (en/es)
  const i18n: any = { sourceLang: detected, raw: { en: freeTextEn } };
  if (detected === "es") {
    i18n.raw.es = freeText;
    i18n.summary = { en: parsedJson.summary, es: await translateTo(parsedJson.summary, "es") };
  }
  parsedJson.i18n = i18n;

  // Use memberId if provided, otherwise use LLM-extracted name, then fallback to provided name
  const finalMemberId = memberId;
  const finalMemberName =
    parsedJson.memberName || memberName || "Unknown";

  // Save note first and get the inserted record id + effective member id
  const inserted = await saveNoteToDB({
    memberId: finalMemberId,
    memberName: finalMemberName,
    activityType,
    sessionDate,
    freeText,
    structuredNote: parsedJson,
  });

  // Compute "summary so far" up to this note's timestamp and persist into structured_json
  try {
    const summary = await generateSummarySoFar(inserted.member_id, inserted.created_at);
    let updatedStructured: any = { ...(parsedJson || {}), soFarSummary: summary };
    if (detected === "es") {
      const summaryEs = await translateTo(summary, "es");
      updatedStructured = {
        ...updatedStructured,
        i18n: {
          ...(parsedJson.i18n || {}),
          soFarSummary: { en: summary, es: summaryEs },
        },
      };
    }
    await supabase
      .from("notes")
      .update({ structured_json: updatedStructured })
      .eq("id", inserted.id);
    return NextResponse.json(updatedStructured);
  } catch (e) {
    // If summary generation fails, return original structured note without blocking save
    return NextResponse.json(parsedJson);
  }
}

async function saveNoteToDB({
  memberId,
  memberName,
  activityType,
  sessionDate,
  freeText,
  structuredNote,
}: {
  memberId?: string;
  memberName: string;
  activityType: string;
  sessionDate: string;
  freeText: string;
  structuredNote: any;
}): Promise<{ id: string; member_id: string; created_at: string }> {
  try {
    let member;

    // If memberId is provided, use it directly
    if (memberId) {
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .eq("id", memberId)
        .single();
      
      if (error) throw error;
      member = data;
    }

    // If no member found by ID, try to find by name
    if (!member) {
      const { data } = await supabase
        .from("members")
        .select("*")
        .eq("name", memberName)
        .single();
      member = data;
    }

    // If still no member, create a new one
    if (!member) {
      const { data: newMember, error: memberError } = await supabase
        .from("members")
        .insert([{ name: memberName }])
        .select()
        .single();

      if (memberError) throw memberError;
      member = newMember;
    }

    const { data: insertedNotes, error: noteError } = await supabase
      .from("notes")
      .insert([
        {
          member_id: member.id,
          session_date: sessionDate,
          raw_text: freeText,
          structured_json: structuredNote,
        },
      ])
      .select()
      .limit(1);

    if (noteError) throw noteError;
    const inserted = insertedNotes?.[0];
    return { id: inserted.id, member_id: inserted.member_id, created_at: inserted.created_at };
  } catch (err) {
    console.error("Failed to save note:", err);
    throw err;
  }
}

async function generateSummarySoFar(memberId: string, timestamp: string): Promise<string> {
  // Fetch all prior notes up to the given time and summarize
  const { data: notes, error } = await supabase
    .from("notes")
    .select("structured_json, raw_text, created_at")
    .eq("member_id", memberId)
    .lte("created_at", timestamp)
    .order("created_at", { ascending: true });

  if (error || !notes?.length) return "";

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

  return completion.choices[0]?.message?.content?.trim() || "";
}