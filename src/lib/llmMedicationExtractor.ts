import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Extracts medication info (name, dose, route, time, status) from caregiver note.
 */
export async function extractMedications(noteText: string) {
  const prompt = `
You are a clinical documentation assistant.
Extract all medication administration details from the caregiver note below.
Return a JSON array with the following fields for each medication:
- name
- dose
- route
- time
- status ("Given", "Missed", "Refused", or null)

If no medication is mentioned, return [].
Note:
"""${noteText}"""
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.choices?.[0]?.message?.content?.trim() ?? "[]";

  try {
    return JSON.parse(text);
  } catch {
    return [];
  }
}