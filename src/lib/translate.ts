import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type Lang = "en" | "es";

export async function detectLanguage(text: string): Promise<Lang> {
  if (!process.env.OPENAI_API_KEY) return "en"; // fallback
  const prompt = `Detect language of the text. Return strictly one of: en, es.\nText:\n${text}`;
  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      { role: "system", content: "You return only a two-letter code." },
      { role: "user", content: prompt },
    ],
  });
  const code = resp.choices[0]?.message?.content?.trim().toLowerCase();
  return code === "es" ? "es" : "en";
}

export async function translateTo(text: string, target: Lang): Promise<string> {
  if (!process.env.OPENAI_API_KEY) return text; // no-op fallback
  if (!text) return text;
  const sys = `Translate the user's text to ${target === "es" ? "Spanish" : "English"}. Return only the translated text.`;
  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: text },
    ],
  });
  return resp.choices[0]?.message?.content?.trim() || text;
}





