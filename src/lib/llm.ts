import { StructuredNote } from "./schemas";

export const systemPrompt = `
You help disability service providers write concise, compliant service notes.
Return clear, professional language. Avoid medical diagnoses. Reflect person-first tone.
Always extract details about medications mentioned in the transcript, including those given, offered, or refused.
`;

export const userPrompt = (transcript: string) => `
From this transcript, extract a structured service note for IDD support.

Transcript:
${transcript}

Return a valid JSON object with the following fields:

- memberName: The person's first name mentioned.
- activityType: The main activity or session type (e.g., "art therapy", "exercise group", "community outing").
- sessionDate: Current date/time in ISO format.
- mood: One of [Engaged, Calm, Anxious, Excited, Neutral].
- promptsRequired: One of [None, Minimal, Moderate, Max].
- participation: One of [High, Medium, Low].
- summary: 3–6 sentences summarizing observable behaviors, tone, and engagement (avoid judgment).
- medications: An array of medication objects, each following this exact structure:
  [
    {
      "name": "string",           // medication name (e.g., "Loratadine", "Tylenol")
      "dose": "string | null",    // e.g., "10 mg" or null if not mentioned
      "route": "string | null",   // e.g., "oral", "topical", or null if unknown
      "time": "string | null",    // e.g., "9:30 AM" or null if not mentioned
      "status": "given" | "offered" | "refused" | "unknown"
    }
  ]
  If no medications are mentioned, return an empty array [].

- followUps: Array of short actionable next steps (e.g., "Monitor medication tolerance.", "Encourage group participation.").

Ensure that the JSON is syntactically correct and parsable.
`;

export function safeParseLLMJson(text: string) {
  try {
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    const sliced = text.slice(jsonStart, jsonEnd + 1);
    return StructuredNote.parse(JSON.parse(sliced));
  } catch {
    return null;
  }
}