import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Extracts medication info (name, dose, route, time, status) from caregiver note.
 * Uses strict JSON schema via the Responses API to ensure valid JSON.
 */
export async function extractMedications(noteText: string) {
  if (!process.env.OPENAI_API_KEY) {
    return [];
  }

  const system = "Extract medication administrations from caregiver notes. Return strict JSON only.";
  const user = `Return an object of the form {"medications": [{"name": string|null, "dose": string|null, "route": string|null, "time": string|null, "status": "given"|"offered"|"refused"|"missed"|"unknown"|null}]}.
If no medications are mentioned, return {"medications": []}.
Do not include any text outside of JSON.

Note:\n${noteText}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  const text = completion.choices?.[0]?.message?.content ?? "{\"medications\":[]}";

  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed?.medications) ? parsed.medications : [];
  } catch {
    return [];
  }
}