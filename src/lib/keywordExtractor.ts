import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Extracts relevant keywords and concepts from voice notes for program matching.
 * Uses GPT to identify key themes, skills, activities, and life domains mentioned.
 * Returns an array of keywords that can be used for vector search.
 */
export async function extractKeywords(noteText: string): Promise<string[]> {
  if (!process.env.OPENAI_API_KEY) {
    // Fallback: simple keyword extraction using basic NLP
    return extractKeywordsFallback(noteText);
  }

  const system = `You are an expert at analyzing caregiver notes and extracting relevant keywords, concepts, and themes that relate to life skills, activities, and program areas for individuals with disabilities.

Extract keywords that would help match this note to relevant programs. Focus on:
- Life skills mentioned (e.g., cooking, hygiene, communication, social interaction)
- Activities described (e.g., meal preparation, group activities, exercise)
- Skills being worked on (e.g., following directions, turn-taking, independence)
- Areas of need or interest (e.g., daily living, social skills, communication)
- Specific behaviors or goals mentioned

Return a JSON object with a "keywords" array containing 5-15 relevant keywords/phrases.`;

  const user = `Extract keywords from this caregiver note that would help match it to relevant programs:

${noteText}

Return JSON in this format:
{
  "keywords": ["keyword1", "keyword2", "keyword3", ...]
}

Include both specific terms and broader concepts. Focus on actionable skills and life domains.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const text = completion.choices?.[0]?.message?.content ?? '{"keywords":[]}';
    const parsed = JSON.parse(text);
    
    if (Array.isArray(parsed?.keywords) && parsed.keywords.length > 0) {
      return parsed.keywords;
    }
    
    // Fallback if LLM returns empty or invalid
    return extractKeywordsFallback(noteText);
  } catch (error) {
    console.error("Error extracting keywords with GPT:", error);
    return extractKeywordsFallback(noteText);
  }
}

/**
 * Fallback keyword extraction using basic NLP techniques.
 * Extracts meaningful words, removes stop words, and identifies key phrases.
 */
function extractKeywordsFallback(noteText: string): string[] {
  // Common stop words to filter out
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
    "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
    "will", "would", "should", "could", "may", "might", "must", "can", "this", "that", "these", "those",
    "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them",
    "his", "her", "its", "our", "their", "my", "your", "their",
    "very", "really", "quite", "just", "only", "also", "too", "so", "as", "than", "more", "most",
    "from", "into", "onto", "upon", "about", "above", "below", "between", "among", "through", "during",
    "before", "after", "while", "when", "where", "why", "how", "what", "which", "who", "whom",
    "not", "no", "yes", "all", "each", "every", "some", "any", "many", "much", "few", "little",
    "one", "two", "three", "first", "second", "last", "next", "previous", "other", "another",
    "well", "good", "bad", "better", "best", "worse", "worst", "big", "small", "large", "little",
    "new", "old", "young", "same", "different", "long", "short", "high", "low", "early", "late",
    "today", "yesterday", "tomorrow", "now", "then", "here", "there", "where", "everywhere", "somewhere",
    "up", "down", "out", "off", "over", "under", "again", "further", "then", "once",
    "said", "says", "say", "get", "got", "go", "went", "come", "came", "see", "saw", "know", "knew",
    "think", "thought", "take", "took", "make", "made", "give", "gave", "find", "found", "tell", "told",
    "ask", "asked", "work", "worked", "try", "tried", "use", "used", "need", "needed", "want", "wanted",
    "like", "liked", "help", "helped", "show", "showed", "move", "moved", "live", "lived", "believe", "believed"
  ]);

  // Convert to lowercase and split into words
  const words = noteText
    .toLowerCase()
    .replace(/[^\w\s]/g, " ") // Replace punctuation with spaces
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word)); // Filter short words and stop words

  // Count word frequencies
  const wordFreq: Record<string, number> = {};
  words.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });

  // Extract top keywords (by frequency, minimum 2 occurrences or length > 5)
  const keywords = Object.entries(wordFreq)
    .filter(([word, freq]) => freq >= 2 || word.length > 5)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([word]) => word);

  // Also extract common phrases (2-3 word combinations)
  const phrases: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    const phrase = `${words[i]} ${words[i + 1]}`;
    if (phrase.length > 5 && !stopWords.has(words[i]) && !stopWords.has(words[i + 1])) {
      phrases.push(phrase);
    }
  }

  // Count phrase frequencies
  const phraseFreq: Record<string, number> = {};
  phrases.forEach(phrase => {
    phraseFreq[phrase] = (phraseFreq[phrase] || 0) + 1;
  });

  // Add top phrases
  const topPhrases = Object.entries(phraseFreq)
    .filter(([_, freq]) => freq >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([phrase]) => phrase);

  return [...new Set([...keywords, ...topPhrases])].slice(0, 15);
}

