import { NextRequest, NextResponse } from "next/server";
import { RawNoteInput } from "@/lib/schemas";
import { systemPrompt, userPrompt, safeParseLLMJson } from "@/lib/llm";
import { supabase } from "@/lib/supabase";
import { extractMedications } from "@/lib/llmMedicationExtractor"; // ✅ added

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = RawNoteInput.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const { memberName, activityType, sessionDate, freeText } = parsed.data;

  if (!process.env.OPENAI_API_KEY) {
    const fallback = {
      memberName,
      activityType,
      sessionDate,
      mood: "Engaged",
      promptsRequired: "Minimal",
      participation: "High",
      summary: `${memberName} participated in ${activityType} on ${sessionDate}. They engaged well with minimal prompts, followed instructions, and demonstrated improved independence in targeted tasks. No safety concerns noted. Staff provided positive reinforcement and gentle cues.`,
      followUps: [
        "Continue with next-level modules",
        "Add 5-minute warm-up routine",
      ],
      medications: []
    };

    const medications = await extractMedications(freeText);
    fallback.medications = medications;

    await saveNoteToDB({
      memberName,
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
        { role: "user", content: userPrompt(freeText) },
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

  const medications = await extractMedications(freeText);
  parsedJson.medications = medications;

  await saveNoteToDB({
    memberName,
    activityType,
    sessionDate,
    freeText,
    structuredNote: parsedJson,
  });

  return NextResponse.json(parsedJson);
}

async function saveNoteToDB({
  memberName,
  activityType,
  sessionDate,
  freeText,
  structuredNote,
}: {
  memberName: string;
  activityType: string;
  sessionDate: string;
  freeText: string;
  structuredNote: any;
}) {
  try {
    let { data: member } = await supabase
      .from("members")
      .select("*")
      .eq("name", memberName)
      .single();

    if (!member) {
      const { data: newMember, error: memberError } = await supabase
        .from("members")
        .insert([{ name: memberName }])
        .select()
        .single();

      if (memberError) throw memberError;
      member = newMember;
    }

    const { error: noteError } = await supabase.from("notes").insert([
      {
        member_id: member.id,
        session_date: sessionDate,
        raw_text: freeText,
        structured_json: structuredNote, // ✅ medications are included automatically
      },
    ]);

    if (noteError) throw noteError;
  } catch (err) {
    console.error("Failed to save note:", err);
  }
}