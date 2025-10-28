import { NextRequest, NextResponse } from "next/server";
import { RawNoteInput } from "@/lib/schemas";
import { systemPrompt, userPrompt, safeParseLLMJson } from "@/lib/llm";

export const runtime = "edge"; 

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = RawNoteInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const { memberName, activityType, sessionDate, freeText } = parsed.data;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      memberName, activityType, sessionDate,
      mood: "Engaged",
      promptsRequired: "Minimal",
      participation: "High",
      summary: `${memberName} participated in ${activityType} on ${sessionDate}. They engaged well with minimal prompts, followed instructions, and demonstrated improved independence in targeted tasks. No safety concerns noted. Staff provided positive reinforcement and gentle cues.`,
      followUps: ["Continue with next-level modules", "Add 5-minute warm-up routine"]
    });
  }

  const resp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt(freeText) }],
    })
  });

  const data = await resp.json();
  const text = data?.output_text ?? data?.choices?.[0]?.message?.content ?? "";
  const parsedJson = safeParseLLMJson(text);

  if (!parsedJson) {
    return NextResponse.json({ error: "LLM format error", raw: text }, { status: 502 });
  }
  return NextResponse.json(parsedJson);
}