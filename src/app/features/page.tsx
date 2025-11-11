"use client";

import { useEffect } from "react";
import NavBar from "@/components/NavBar";
import { 
  Mic, 
  FileText, 
  Brain, 
  TrendingUp, 
  BarChart3, 
  Download, 
  Languages,
  Sparkles,
  Search,
  Clock,
  Target
} from "lucide-react";

export default function FeaturesPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen" style={{ 
      background: 'linear-gradient(to bottom, #e6f2ff, #c0e0ff, #a0c8f0)' 
    }}>
      <NavBar />
      
      <div className="pt-20 pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4" style={{ color: '#333333' }}>
              Kibu Companion Features
            </h1>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: '#333333' }}>
              A comprehensive voice-powered note-taking system with intelligent program recommendations and progress tracking
            </p>
          </div>

          {/* RAG Technology Highlight Banner */}
          <div className="mb-12 bg-white rounded-lg shadow-lg p-8 border border-gray-200" style={{ borderColor: '#e0e0e0' }}>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#c0e0ff' }}>
                  <Brain className="w-7 h-7" style={{ color: '#333333' }} />
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-3" style={{ color: '#333333' }}>
                  Powered by RAG & Semantic Search Technology
                </h2>
                <p className="text-lg mb-4" style={{ color: '#333333' }}>
                  Our standout feature uses Retrieval-Augmented Generation (RAG) combined with semantic search to provide intelligent, context-aware program recommendations. This advanced AI technology understands meaning, not just keywords, ensuring recommendations match a member's actual needs and progress patterns.
                </p>
                <div className="grid md:grid-cols-3 gap-4 mt-6">
                  <div className="rounded-lg p-4 border" style={{ backgroundColor: '#f0f8ff', borderColor: '#c0e0ff' }}>
                    <h3 className="font-semibold mb-2" style={{ color: '#333333' }}>Semantic Understanding</h3>
                    <p className="text-sm" style={{ color: '#555555' }}>Matches programs by meaning, not just word matching</p>
                  </div>
                  <div className="rounded-lg p-4 border" style={{ backgroundColor: '#f0f8ff', borderColor: '#c0e0ff' }}>
                    <h3 className="font-semibold mb-2" style={{ color: '#333333' }}>Historical Analysis</h3>
                    <p className="text-sm" style={{ color: '#555555' }}>Analyzes 21 days of progress to identify patterns</p>
                  </div>
                  <div className="rounded-lg p-4 border" style={{ backgroundColor: '#f0f8ff', borderColor: '#c0e0ff' }}>
                    <h3 className="font-semibold mb-2" style={{ color: '#333333' }}>AI-Generated Insights</h3>
                    <p className="text-sm" style={{ color: '#555555' }}>Explains why programs are recommended</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="space-y-8">
            
            {/* Historical Recommendations - Featured First */}
            <FeatureCard
              icon={<Brain className="w-6 h-6" />}
              title="🌟 Historical Program Recommendations (RAG & Semantic Search)"
              description="Get personalized program suggestions based on a member's progress over the last 21 days using advanced RAG (Retrieval-Augmented Generation) and semantic search technology that understands context, patterns, and meaning."
              techSection={{
                title: "How RAG Extracts Recommendations: A Deep Dive",
                explanation: "RAG (Retrieval-Augmented Generation) combines two powerful techniques: semantic search to find relevant information, and AI generation to create personalized recommendations. Here's the complete process:",
                steps: [
                  {
                    title: "Step 1: Note Collection & Embedding Generation",
                    description: "When notes are created, all structured data (summary, mood, participation, activity type, medications, follow-ups) is combined into a semantic text. This text is then converted into a 512-dimensional embedding vector using OpenAI's embedding model. Each embedding is like a 'fingerprint' that captures the meaning and context of the note - not just the words, but what they actually mean."
                  },
                  {
                    title: "Step 2: Storage in Vector Database",
                    description: "All note embeddings are stored in Pinecone, a specialized vector database. Each embedding is tagged with metadata like member ID, date, mood scores, participation levels, and activity types. Similarly, all programs are also converted to embeddings and stored, creating a searchable knowledge base of programs with their descriptions, categories, and life skills."
                  },
                  {
                    title: "Step 3: Historical Context Retrieval (The 'Retrieval' Part)",
                    description: "When requesting recommendations, the system retrieves all note embeddings from the last 21 days for the member. This collection of embeddings represents the member's recent history, patterns, progress, and needs. The system filters by member ID and date range to get the relevant historical context."
                  },
                  {
                    title: "Step 4: Progress Vector Creation",
                    description: "All retrieved note embeddings are mathematically averaged to create a single 'progress vector'. This vector represents the member's overall trajectory - combining their moods, activities, participation levels, and progress patterns into one comprehensive representation. Think of it as creating a 'composite picture' of where the member is in their journey."
                  },
                  {
                    title: "Step 5: Trend Analysis & Scoring",
                    description: "The system analyzes individual trend scores (mood_score, participation_score, prompt_score) from all notes to identify patterns. It compares recent notes with older ones to determine if the member is improving (mood and participation increasing), stable, or declining (needing more support). These trends help the system understand what type of programs would be most beneficial."
                  },
                  {
                    title: "Step 6: Semantic Search - Finding Relevant Programs (The 'Augmented' Part)",
                    description: "The progress vector is used as a query to search the vector database. Using cosine similarity (a mathematical measure of how similar two vectors are), the system finds programs whose embeddings are closest to the member's progress vector. This is semantic search - it matches meaning, not keywords. For example, if notes mention 'meal preparation' and 'following recipes', it will find programs about 'cooking skills' even if those exact words weren't used, because the embeddings capture the underlying meaning."
                  },
                  {
                    title: "Step 7: Program Ranking & Filtering",
                    description: "Programs are ranked by their similarity scores (0-1 scale, where 1.0 is a perfect match). The system retrieves the top matching programs and filters them to ensure diversity and relevance. Programs with higher similarity scores are more aligned with the member's current needs and progress patterns."
                  },
                  {
                    title: "Step 8: AI Generation of Personalized Insights (The 'Generation' Part)",
                    description: "Finally, GPT-4 analyzes the retrieved programs, the member's progress vector, trend data, and focus areas to generate personalized recommendation text. The AI explains why each program is recommended, what focus areas it addresses, and how it aligns with the member's progress. This combines the retrieved context (programs) with AI reasoning to create human-readable, actionable recommendations."
                  }
                ],
                technologies: [
                  "OpenAI Embeddings (text-embedding-3-small) - Converts text to 512-dimensional vectors that capture semantic meaning",
                  "Pinecone Vector Database - Specialized database for storing and searching embeddings at scale",
                  "Cosine Similarity - Mathematical measure (0-1) that calculates how similar two embeddings are",
                  "Semantic Search - Search technology that understands meaning, not just keyword matching",
                  "GPT-4 - Generates personalized recommendation explanations using retrieved program context",
                  "RAG Architecture - Combines retrieval (finding relevant programs) with generation (creating insights)"
                ]
              }}
              details={[
                "Analyzes last 21 days of notes (configurable time window)",
                "Uses semantic search to match programs by meaning, not just keywords",
                "Identifies improving, stable, or declining trends automatically",
                "Shows focus areas and program categories",
                "Provides AI-generated insights explaining why programs are recommended",
                "Updates automatically as new notes are added",
                "Considers mood, participation, independence, and activity patterns"
              ]}
            />

            {/* Note-Level Program Recommendations */}
            <FeatureCard
              icon={<Target className="w-6 h-6" />}
              title="Note-Level Program Recommendations"
              description="Get instant program suggestions when you create a note, based on the specific content and context of that session."
              techSection={{
                title: "How It Works",
                explanation: "This feature uses AI-powered keyword extraction and semantic search to match your note content with relevant programs:",
                steps: [
                  {
                    title: "Keyword Extraction",
                    description: "An AI model analyzes your note and extracts relevant keywords, concepts, and themes - focusing on life skills, activities, behaviors, and areas of need or interest."
                  },
                  {
                    title: "Semantic Search",
                    description: "The extracted keywords are used to search through all available programs in the vector database. The system finds programs that match the meaning and context of your note, not just exact word matches."
                  },
                  {
                    title: "Similarity Scoring",
                    description: "Each program is given a similarity score (0-1) that indicates how well it matches the note content. Programs with higher scores are more relevant."
                  },
                  {
                    title: "Program Ranking",
                    description: "Programs are ranked by relevance and the top matches are displayed. The system considers program descriptions, categories, life skills, and keywords."
                  },
                  {
                    title: "Automatic Saving",
                    description: "Recommendations are automatically saved and linked to the specific note and date, so you can review them later or filter by date."
                  }
                ],
                technologies: [
                  "GPT-4o-mini - Extracts keywords and concepts from notes",
                  "Pinecone Vector Database - Stores program embeddings for fast semantic search",
                  "Vector Similarity Search - Finds programs matching note content",
                  "Supabase - Stores recommendations linked to notes and dates"
                ]
              }}
              details={[
                "Instant recommendations when creating notes",
                "Matches programs based on note content and context",
                "Shows similarity scores for each recommendation",
                "Automatically saves recommendations with notes",
                "Filter recommendations by date or note"
              ]}
            />

            {/* Voice Recording & Transcription */}
            <FeatureCard
              icon={<Mic className="w-6 h-6" />}
              title="Voice Note Recording"
              description="Record caregiver notes using your browser's built-in speech recognition. Simply speak your notes and they're automatically transcribed into text."
              details={[
                "Browser-based speech-to-text conversion",
                "Real-time transcription as you speak",
                "Manual text editing available",
                "Supports continuous recording",
                "Works on all modern browsers"
              ]}
            />

            {/* Structured Note Generation */}
            <FeatureCard
              icon={<FileText className="w-6 h-6" />}
              title="Smart Note Structuring"
              description="Automatically extracts and organizes information from your voice notes into structured data including mood, participation levels, activities, medications, and follow-up actions."
              details={[
                "AI-powered note parsing and extraction",
                "Compliance checking for required fields",
                "Automatic categorization of information",
                "Medication tracking with dosages and times",
                "Follow-up action identification"
              ]}
            />

            {/* Progress Insights */}
            <FeatureCard
              icon={<BarChart3 className="w-6 h-6" />}
              title="Progress Insights & Analytics"
              description="Visualize member progress over time with interactive charts showing mood trends, participation levels, activity performance, and more."
              details={[
                "Multi-metric trend line charts (mood, participation, independence)",
                "Mood distribution over time",
                "Activity performance analysis",
                "Participation vs prompts correlation",
                "Weekly and daily patterns",
                "Medication compliance tracking",
                "Progress scorecard with radar charts"
              ]}
            />

            {/* Bilingual Support */}
            <FeatureCard
              icon={<Languages className="w-6 h-6" />}
              title="Bilingual Support (English/Spanish)"
              description="View notes and summaries in both English and Spanish with automatic translation and bilingual interface support."
              details={[
                "Toggle between English and Spanish",
                "Automatic translation of summaries",
                "Bilingual interface elements",
                "Preserves original note language"
              ]}
            />

            {/* PDF Export */}
            <FeatureCard
              icon={<Download className="w-6 h-6" />}
              title="PDF Export"
              description="Export notes for a selected date as a professional PDF document for records, reports, or sharing with team members."
              details={[
                "Export notes by date",
                "Professional formatting",
                "Includes all note details and summaries",
                "Downloadable PDF files"
              ]}
            />

            {/* Timeline View */}
            <FeatureCard
              icon={<Clock className="w-6 h-6" />}
              title="Timeline View"
              description="View all notes organized by date and time in a clear timeline format, making it easy to see the progression of sessions and activities."
              details={[
                "Notes organized by date",
                "Time-stamped entries",
                "Chronological ordering",
                "Easy date navigation",
                "Summary view up to each note"
              ]}
            />

            {/* Quick Actions */}
            <FeatureCard
              icon={<Sparkles className="w-6 h-6" />}
              title="Quick Actions"
              description="Get suggested actions based on note content, helping caregivers quickly identify next steps and follow-up items."
              details={[
                "AI-inferred action suggestions",
                "Context-aware recommendations",
                "Based on note content and patterns"
              ]}
            />

          </div>

          {/* Technology Overview Section */}
          <div className="mt-16 bg-white rounded-lg shadow-md p-8 border" style={{ borderColor: '#e0e0e0' }}>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3" style={{ color: '#333333' }}>
              <Brain className="w-7 h-7" style={{ color: '#333333' }} />
              Technology Overview
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3" style={{ color: '#333333' }}>Core Technologies</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <TechItem
                    name="OpenAI GPT-4"
                    description="Powers note structuring, keyword extraction, and AI-generated insights"
                  />
                  <TechItem
                    name="OpenAI Embeddings"
                    description="Converts text into mathematical vectors for semantic understanding"
                  />
                  <TechItem
                    name="Pinecone Vector Database"
                    description="Stores and searches program and note embeddings for fast semantic matching"
                  />
                  <TechItem
                    name="Supabase"
                    description="Manages notes, members, and program recommendations in a secure database"
                  />
                  <TechItem
                    name="Next.js"
                    description="Modern React framework for building the user interface"
                  />
                  <TechItem
                    name="Web Speech API"
                    description="Browser-based speech recognition for voice note recording"
                  />
                </div>
              </div>

              <div className="pt-6" style={{ borderTopColor: '#e0e0e0', borderTopWidth: '1px', borderTopStyle: 'solid' }}>
                <h3 className="text-lg font-semibold mb-3" style={{ color: '#333333' }}>Key Concepts</h3>
                <div className="space-y-4">
                  <ConceptItem
                    term="RAG (Retrieval-Augmented Generation)"
                    definition="A technology that combines information retrieval with AI generation. It searches through stored data (programs) and uses that context to generate personalized recommendations."
                  />
                  <ConceptItem
                    term="Embeddings"
                    definition="Mathematical representations of text that capture meaning. Similar concepts have similar embeddings, allowing the system to find related programs even if they use different words."
                  />
                  <ConceptItem
                    term="Semantic Search"
                    definition="Search that understands meaning, not just keywords. It can find programs about 'cooking skills' even if the note mentions 'meal preparation' - because they mean the same thing."
                  />
                  <ConceptItem
                    term="Cosine Similarity"
                    definition="A mathematical measure that calculates how similar two embeddings are. Higher similarity scores (closer to 1.0) mean better matches between notes and programs."
                  />
                  <ConceptItem
                    term="Progress Vector"
                    definition="A combined representation of multiple notes that shows a member's overall progress trajectory. It's created by averaging all note embeddings from a time period."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 text-center text-sm" style={{ color: '#555555' }}>
            <p>Kibu Companion - Intelligent Note-Taking for Care Providers</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  details,
  techSection,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  details: string[];
  techSection?: {
    title: string;
    explanation: string;
    steps: Array<{ title: string; description: string }>;
    technologies: string[];
  };
}) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border hover:shadow-lg transition-shadow" style={{ borderColor: '#e0e0e0' }}>
      <div className="flex items-start gap-4 mb-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#c0e0ff' }}>
          <div style={{ color: '#333333' }}>
            {icon}
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-semibold mb-2" style={{ color: '#333333' }}>{title}</h3>
          <p className="mb-4" style={{ color: '#333333' }}>{description}</p>
        </div>
      </div>

      {/* Technology Explanation Section */}
      {techSection && (
        <div className="mb-6 p-4 rounded-lg border" style={{ backgroundColor: '#f0f8ff', borderColor: '#c0e0ff' }}>
          <h4 className="text-lg font-semibold mb-2" style={{ color: '#333333' }}>{techSection.title}</h4>
          <p className="mb-4" style={{ color: '#333333' }}>{techSection.explanation}</p>
          
          <div className="space-y-4 mb-4">
            {techSection.steps.map((step, idx) => (
              <div key={idx} className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold text-white" style={{ backgroundColor: '#333333' }}>
                  {idx + 1}
                </div>
                <div>
                  <h5 className="font-semibold mb-1" style={{ color: '#333333' }}>{step.title}</h5>
                  <p className="text-sm" style={{ color: '#555555' }}>{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4" style={{ borderTopColor: '#c0e0ff', borderTopWidth: '1px', borderTopStyle: 'solid' }}>
            <h5 className="font-semibold mb-2 text-sm" style={{ color: '#333333' }}>Technologies Used:</h5>
            <ul className="space-y-1">
              {techSection.technologies.map((tech, idx) => (
                <li key={idx} className="text-sm flex items-start gap-2" style={{ color: '#333333' }}>
                  <span className="mt-1" style={{ color: '#555555' }}>•</span>
                  <span>{tech}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Feature Details */}
      <div>
        <h4 className="font-semibold mb-2" style={{ color: '#333333' }}>Key Features:</h4>
        <ul className="space-y-2">
          {details.map((detail, idx) => (
            <li key={idx} className="text-sm flex items-start gap-2" style={{ color: '#333333' }}>
              <span className="mt-1" style={{ color: '#333333' }}>✓</span>
              <span>{detail}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TechItem({ name, description }: { name: string; description: string }) {
  return (
    <div className="p-4 rounded-lg border" style={{ backgroundColor: '#f0f8ff', borderColor: '#c0e0ff' }}>
      <h4 className="font-semibold mb-1" style={{ color: '#333333' }}>{name}</h4>
      <p className="text-sm" style={{ color: '#555555' }}>{description}</p>
    </div>
  );
}

function ConceptItem({ term, definition }: { term: string; definition: string }) {
  return (
    <div>
      <h4 className="font-semibold mb-1" style={{ color: '#333333' }}>{term}</h4>
      <p className="text-sm" style={{ color: '#333333' }}>{definition}</p>
    </div>
  );
}

