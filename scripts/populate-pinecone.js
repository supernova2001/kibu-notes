/**
 * Script to populate Pinecone vector database with program embeddings
 * 
 * Usage:
 *   node scripts/populate-pinecone.js
 * 
 * Requires environment variables:
 *   - PINECONE_API_KEY
 *   - PINECONE_INDEX_NAME (defaults to "notes-companion")
 *   - OPENAI_API_KEY
 */

const { Pinecone } = require('@pinecone-database/pinecone');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'notes-companion';

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is required');
  process.exit(1);
}

if (!PINECONE_API_KEY) {
  console.error('❌ PINECONE_API_KEY is required');
  process.exit(1);
}

// Initialize clients
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });

/**
 * Generate embedding for text using OpenAI
 */
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      dimensions: 512, // Match your Pinecone index dimension
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Prepare text for embedding generation
 * Combines title, synopsis, keywords, and life skills for better semantic search
 */
function prepareTextForEmbedding(program) {
  const parts = [
    program.title,
    program.synopsis,
    ...(program.keywords || []),
    ...(program.lifeSkills || []),
  ];
  return parts.join(' ');
}

/**
 * Main function to populate Pinecone
 */
async function populatePinecone() {
  try {
    console.log('🚀 Starting Pinecone population...\n');

    // Load programs data
    const programsPath = path.join(__dirname, '../programs-data.json');
    if (!fs.existsSync(programsPath)) {
      console.error(`❌ Programs file not found: ${programsPath}`);
      process.exit(1);
    }

    const programsData = JSON.parse(fs.readFileSync(programsPath, 'utf8'));
    console.log(`📚 Loaded ${programsData.length} programs from JSON\n`);

    // Connect to Pinecone index
    console.log(`🔌 Connecting to Pinecone index: ${PINECONE_INDEX_NAME}`);
    const index = pinecone.index(PINECONE_INDEX_NAME);

    // Verify index connection
    try {
      const stats = await index.describeIndexStats();
      console.log(`✅ Connected to index`);
      console.log(`   Dimension: ${stats.dimension}`);
      console.log(`   Current vectors: ${stats.totalRecordCount || 0}\n`);
    } catch (error) {
      console.error('❌ Failed to connect to index:', error.message);
      process.exit(1);
    }

    // Process programs in batches
    const batchSize = 10;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < programsData.length; i += batchSize) {
      const batch = programsData.slice(i, i + batchSize);
      console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} programs)...`);

      const vectors = [];

      for (const program of batch) {
        try {
          // Prepare text for embedding
          const textToEmbed = prepareTextForEmbedding(program);
          console.log(`   Generating embedding for: ${program.title}...`);

          // Generate embedding
          const embedding = await generateEmbedding(textToEmbed);

          // Prepare metadata
          const metadata = {
            name: program.title,
            title: program.title,
            description: program.synopsis,
            synopsis: program.synopsis,
            category: program.category,
            url: program.url,
            link: program.url,
            instructor: program.instructor,
            keywords: program.keywords || [],
            lifeSkills: program.lifeSkills || [],
          };

          // Add to vectors array
          vectors.push({
            id: program.id,
            values: embedding,
            metadata: metadata,
          });

          console.log(`   ✅ Generated embedding for: ${program.title}`);
        } catch (error) {
          console.error(`   ❌ Error processing ${program.title}:`, error.message);
          errorCount++;
        }
      }

      // Upsert batch to Pinecone
      if (vectors.length > 0) {
        try {
          console.log(`   📤 Uploading ${vectors.length} vectors to Pinecone...`);
          await index.upsert(vectors);
          successCount += vectors.length;
          console.log(`   ✅ Successfully uploaded batch to Pinecone`);
        } catch (error) {
          console.error(`   ❌ Error uploading batch to Pinecone:`, error.message);
          errorCount += vectors.length;
        }
      }

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < programsData.length) {
        console.log('   ⏳ Waiting 1 second before next batch...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Final summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Population Summary:');
    console.log(`   ✅ Successfully processed: ${successCount} programs`);
    if (errorCount > 0) {
      console.log(`   ❌ Errors: ${errorCount} programs`);
    }
    console.log('='.repeat(50));

    // Verify final count
    try {
      const finalStats = await index.describeIndexStats();
      console.log(`\n📈 Final index stats:`);
      console.log(`   Total vectors: ${finalStats.totalRecordCount || 0}`);
      console.log(`   Index fullness: ${((finalStats.indexFullness || 0) * 100).toFixed(2)}%`);
    } catch (error) {
      console.warn('⚠️  Could not fetch final stats:', error.message);
    }

    console.log('\n✅ Pinecone population completed!');
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
populatePinecone();

