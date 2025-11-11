import { Pinecone } from "@pinecone-database/pinecone";
import { generateEmbedding } from "./embeddings";

let pineconeClient: Pinecone | null = null;

/**
 * Initialize and return Pinecone client instance.
 * Uses singleton pattern to reuse connection.
 */
export async function getPineconeClient(): Promise<Pinecone> {
  if (pineconeClient) {
    return pineconeClient;
  }

  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) {
    throw new Error("PINECONE_API_KEY environment variable is not set");
  }

  pineconeClient = new Pinecone({
    apiKey: apiKey,
  });

  return pineconeClient;
}

/**
 * Get the Pinecone index for programs.
 * The index name should be set in PINECONE_INDEX_NAME environment variable.
 */
export async function getProgramsIndex() {
  const client = await getPineconeClient();
  const indexName = process.env.PINECONE_INDEX_NAME || "notes-companion";
  
  try {
    const index = client.index(indexName);
    return index;
  } catch (error) {
    console.error("Error accessing Pinecone index:", error);
    throw new Error(`Failed to access Pinecone index: ${indexName}`);
  }
}

/**
 * Search for programs in Pinecone using query vector.
 * Returns top K most similar programs with their metadata and similarity scores.
 */
export async function searchPrograms(
  queryVector: number[],
  topK: number = 10,
  filter?: Record<string, any>
) {
  try {
    const index = await getProgramsIndex();
    
    const queryRequest: any = {
      vector: queryVector,
      topK,
      includeMetadata: true,
    };

    if (filter) {
      queryRequest.filter = filter;
    }

    const queryResponse = await index.query(queryRequest);
    
    return queryResponse.matches || [];
  } catch (error) {
    console.error("Error searching Pinecone:", error);
    throw error;
  }
}

/**
 * Helper function to search programs by keywords.
 * 
 * This function supports two modes:
 * 1. With embeddings (recommended): Generates embeddings from keywords and performs vector search
 * 2. Without embeddings (fallback): Uses metadata filtering with zero vectors
 * 
 * For now, we use metadata filtering with keywords. The approach:
 * 1. Try to get index stats to determine vector dimension
 * 2. Use metadata filters to match keywords in program descriptions/life skills
 * 3. Use a zero vector for the query (since we don't have embeddings yet)
 * 
 * When embeddings are ready, set USE_EMBEDDINGS=true in env to enable semantic search.
 * 
 * Note: This requires programs in Pinecone to have metadata fields like:
 * - name, description, category, keywords (array), lifeSkills (array)
 */
export async function searchProgramsByKeywords(
  keywords: string[],
  topK: number = 10,
  useEmbeddings: boolean = false
) {
  try {
    const index = await getProgramsIndex();
    
    // Get index stats to determine vector dimension
    const stats = await index.describeIndexStats();
    const dimension = stats.dimension || 512; // Default to 512 for text-embedding-3-small
    
    let queryVector: number[];
    
    // Option 1: Use embeddings for semantic search (when ready)
    if (useEmbeddings && process.env.OPENAI_API_KEY) {
      try {
        // Combine keywords into a search query
        const searchQuery = keywords.join(" ");
        queryVector = await generateEmbedding(searchQuery);
        console.log("Using embeddings for semantic search");
      } catch (embeddingError) {
        console.warn("Failed to generate embedding, falling back to metadata filter:", embeddingError);
        // Fall through to zero vector approach
        queryVector = new Array(dimension).fill(0);
      }
    } else {
      // Option 2: Use zero vector with metadata filtering (current approach)
      queryVector = new Array(dimension).fill(0);
    }
    
    // Build metadata filter to match keywords
    // This searches in description, name, keywords, and lifeSkills fields
    const lowerKeywords = keywords.map(k => k.toLowerCase());
    
    // Try multiple filter strategies
    let matches: any[] = [];
    
    // Strategy 1: Filter by keywords array field (if programs have this)
    try {
      const keywordFilter = {
        $or: lowerKeywords.map(keyword => ({
          $or: [
            { keywords: { $in: [keyword] } },
            { lifeSkills: { $in: [keyword] } },
            { description: { $contains: keyword } },
            { name: { $contains: keyword } },
          ]
        }))
      };
      
      const queryResponse = await index.query({
        vector: queryVector,
        topK: topK * 2, // Get more results to filter
        includeMetadata: true,
        filter: keywordFilter,
      });
      
      matches = queryResponse.matches || [];
    } catch (filterError) {
      console.warn("Metadata filter query failed, trying without filter:", filterError);
      
      // Strategy 2: Query without filter and filter results in code
      try {
        const queryResponse = await index.query({
          vector: queryVector,
          topK: topK * 3, // Get more results
          includeMetadata: true,
        });
        
        // Filter results by checking if metadata contains any keywords
        matches = (queryResponse.matches || []).filter(match => {
          const metadata = match.metadata || {};
          const searchText = [
            metadata.name || "",
            metadata.description || "",
            ...(Array.isArray(metadata.keywords) ? metadata.keywords : []),
            ...(Array.isArray(metadata.lifeSkills) ? metadata.lifeSkills : []),
          ].join(" ").toLowerCase();
          
          return lowerKeywords.some(keyword => searchText.includes(keyword));
        });
      } catch (queryError) {
        console.error("Query without filter also failed:", queryError);
        return [];
      }
    }
    
    // Score matches based on keyword matches (since we don't have real similarity scores yet)
    const scoredMatches = matches.map(match => {
      const metadata = match.metadata || {};
      const searchText = [
        metadata.name || "",
        metadata.description || "",
        ...(Array.isArray(metadata.keywords) ? metadata.keywords : []),
        ...(Array.isArray(metadata.lifeSkills) ? metadata.lifeSkills : []),
      ].join(" ").toLowerCase();
      
      // Count keyword matches
      const matchCount = lowerKeywords.filter(keyword => 
        searchText.includes(keyword)
      ).length;
      
      // Calculate a simple score based on keyword matches
      const score = matchCount / keywords.length;
      
      return {
        ...match,
        score: score || 0.1, // Minimum score to ensure results are returned
      };
    });
    
    // Sort by score and return top K
    return scoredMatches
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, topK);
      
  } catch (error) {
    console.error("Error searching programs by keywords:", error);
    return [];
  }
}

