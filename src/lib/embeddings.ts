import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generate embeddings for text using OpenAI's text-embedding-3-small model.
 * This model produces 512-dimensional vectors, matching the Pinecone index dimension.
 * 
 * @param text - The text to generate embeddings for
 * @returns A 512-dimensional vector array
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for generating embeddings");
  }

  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      dimensions: 512, // Match your Pinecone index dimension
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts in batch.
 * Useful for indexing multiple programs at once.
 * 
 * @param texts - Array of texts to generate embeddings for
 * @returns Array of 512-dimensional vectors
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for generating embeddings");
  }

  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
      dimensions: 512, // Match your Pinecone index dimension
    });

    return response.data.map(item => item.embedding);
  } catch (error) {
    console.error("Error generating embeddings:", error);
    throw error;
  }
}

