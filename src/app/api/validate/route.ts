import { NextRequest, NextResponse } from "next/server";

const requiredFields = [
  "member name",
  "activity type",
  "goal",
  "participation",
  "prompt",
  "mood",
  "safety",
  "follow-up"
];

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const { freeText } = await req.json();

  if (!freeText) {
    return NextResponse.json(
      { error: "No text provided", missing: requiredFields },
      { status: 400 }
    );
  }

  try {
    const prompt = `
You are a compliance validation assistant for disability service notes.

Analyze the caregiver's note below and:
1. Extract any information that clearly fills one or more of the required compliance fields.
2. Identify which required fields are missing or unclear.

Required fields:
${requiredFields.join(", ")}

Caregiver note:
"""
${freeText}
"""

Return a JSON object in this exact format:
{
  "filled": {
    "member name": "...",
    "activity type": "...",
    "goal": "...",
    "participation": "...",
    "prompt": "...",
    "mood": "...",
    "safety": "...",
    "follow-up": "..."
  },
  "missing": ["..."]
}
If the note already covers everything, return an empty "missing" array.
`;

    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // smaller, faster, reliable JSON reasoning
        input: [
          { role: "system", content: "You extract structured compliance data from caregiver notes." },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
      }),
    });

    const data = await resp.json();
    const text =
      data?.output?.[0]?.content?.[0]?.text ||
      data?.output_text ||
      "";

    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    let parsed = { filled: {}, missing: requiredFields };
    if (jsonStart !== -1 && jsonEnd !== -1) {
      parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Validation error:", err);
    return NextResponse.json(
      { error: "Validation failed", missing: requiredFields },
      { status: 500 }
    );
  }
}