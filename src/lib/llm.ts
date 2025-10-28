import { StructuredNote } from "./schemas";

export const systemPrompt = `
You help disability service providers write concise, compliant service notes.
Return clear, professional language. Avoid medical diagnoses. Reflect person-first tone.
`;

export const userPrompt = (transcript: string) => `
From this transcript, extract a structured service note for IDD support.

Transcript:
${transcript}

Return JSON with:
- memberName
- activityType
- sessionDate (ISO)
- mood (one of: Engaged/Calm/Anxious/Excited/Neutral)
- promptsRequired (None/Minimal/Moderate/Max)
- participation (High/Medium/Low)
- summary (3 to 6 sentences, compliant tone, observable behavior > judgment)
- followUps (array of short actionable next steps)
`;

export function safeParseLLMJson(text: string) {
  try {
    const jsonStart = text.indexOf("{");
    const jsonEnd   = text.lastIndexOf("}");
    const sliced    = text.slice(jsonStart, jsonEnd + 1);
    return StructuredNote.parse(JSON.parse(sliced));
  } catch {
    return null;
  }
}