# Kibu Companion

A comprehensive voice-powered note-taking system with intelligent program recommendations and progress tracking for care providers. Built with Next.js, featuring advanced RAG (Retrieval-Augmented Generation) and semantic search capabilities.

## 🌟 Features

### Core Features
- **Voice Note Recording** - Browser-based speech-to-text transcription
- **Smart Note Structuring** - AI-powered extraction of mood, participation, activities, medications, and follow-ups
- **Historical Program Recommendations** - Personalized suggestions based on 21-day progress analysis using RAG
- **Note-Level Program Recommendations** - Instant program suggestions based on session content
- **Progress Insights & Analytics** - Interactive charts and visualizations
- **Bilingual Support** - English and Spanish interface
- **PDF Export** - Professional note exports
- **Timeline View** - Chronological note organization

### 🧠 Advanced AI Features

#### Historical Recommendations (RAG & Semantic Search)
- Analyzes member progress over the last 21 days
- Uses semantic search to match programs by meaning, not just keywords
- Identifies improving, stable, or declining trends
- Provides AI-generated insights explaining recommendations
- Considers mood, participation, independence, and activity patterns

#### Note-Level Recommendations
- Instant program suggestions when creating notes
- AI-powered keyword extraction
- Semantic matching with similarity scores
- Automatically saves recommendations with notes

## 🚀 Technology Stack

### Frontend
- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible components
- **Nivo** - Data visualization

### Backend & AI
- **OpenAI GPT-4** - Note structuring, keyword extraction, insights
- **OpenAI Embeddings** (text-embedding-3-small) - Semantic understanding
- **Pinecone** - Vector database for semantic search
- **Supabase** - Database and authentication
- **Web Speech API** - Voice recognition

### Key Technologies
- **RAG (Retrieval-Augmented Generation)** - Combines semantic search with AI generation
- **Semantic Search** - Understanding meaning, not just keywords
- **Vector Embeddings** - 512-dimensional representations of text
- **Cosine Similarity** - Matching programs to member progress

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Pinecone account (free tier available)
- OpenAI API key

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd kibu-notes
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # Pinecone Configuration
   PINECONE_API_KEY=your_pinecone_api_key
   PINECONE_INDEX_NAME=notes-companion

   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key
   ```

4. **Set up Supabase database**
   - Create a Supabase project
   - Run the schema file: `supabase_schema_program_recommendations.sql`
   - Ensure you have `members` and `notes` tables

5. **Set up Pinecone**
   - Create a Pinecone account
   - Create an index with dimension 512 (for text-embedding-3-small)
   - Populate with program data:
     ```bash
     npm run populate-pinecone
     ```

6. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🏗️ Project Structure

```
kibu-notes/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── api/               # API routes
│   │   │   ├── programs/      # Program recommendations APIs
│   │   │   ├── members/       # Member management APIs
│   │   │   └── notes/         # Note management APIs
│   │   ├── features/          # Features documentation page
│   │   ├── people/            # Member notes pages
│   │   └── layout.tsx         # Root layout
│   ├── components/            # React components
│   │   ├── AdaptiveRecommendations.tsx
│   │   ├── InsightsSection.tsx
│   │   ├── note-editor.tsx
│   │   └── ui/               # UI components
│   └── lib/                  # Utility libraries
│       ├── embeddings.ts     # OpenAI embeddings
│       ├── pinecone.ts       # Pinecone integration
│       ├── supabase.ts       # Supabase client
│       └── noteEmbeddings.ts # Note embedding logic
├── scripts/
│   └── populate-pinecone.js  # Script to populate Pinecone
└── public/                   # Static assets
```

## 🔑 Environment Variables

### Required
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for server-side operations)
- `PINECONE_API_KEY` - Pinecone API key
- `OPENAI_API_KEY` - OpenAI API key

### Optional
- `PINECONE_INDEX_NAME` - Pinecone index name (default: "notes-companion")

## 🎯 Usage

### Adding Notes
1. Navigate to a member's page
2. Click "Add Note"
3. Record voice note or type manually
4. System automatically structures the note and suggests programs

### Viewing Recommendations
- **Historical Recommendations** (Left Sidebar) - Based on last 21 days of progress
- **Note-Level Recommendations** (Right Sidebar) - Based on current note content

### Viewing Insights
1. Click "View Insights" on a member's page
2. Explore interactive charts and analytics
3. Track mood, participation, and progress trends

## 🧬 How RAG Works

### Historical Recommendations Process

1. **Note Collection & Embedding Generation**
   - Each note is converted to a 512-dimensional embedding vector
   - Captures semantic meaning of mood, activities, participation, etc.

2. **Storage in Vector Database**
   - Note embeddings stored in Pinecone with metadata
   - Program embeddings stored as searchable knowledge base

3. **Historical Context Retrieval**
   - Retrieves all note embeddings from last 21 days
   - Filters by member ID and date range

4. **Progress Vector Creation**
   - Averages all note embeddings to create a "progress vector"
   - Represents member's overall trajectory

5. **Trend Analysis**
   - Analyzes mood, participation, and independence scores
   - Identifies improving, stable, or declining trends

6. **Semantic Search**
   - Uses progress vector to search program database
   - Matches programs by meaning using cosine similarity
   - Finds relevant programs even if keywords don't match exactly

7. **Program Ranking**
   - Programs ranked by similarity scores (0-1)
   - Top matches filtered for diversity and relevance

8. **AI-Generated Insights**
   - GPT-4 generates personalized recommendation explanations
   - Explains why programs are recommended and focus areas

### Note-Level Recommendations Process

1. **Keyword Extraction** - AI extracts relevant keywords and concepts
2. **Semantic Search** - Searches programs using extracted keywords
3. **Similarity Scoring** - Each program gets a relevance score
4. **Program Ranking** - Programs ranked by relevance
5. **Automatic Saving** - Recommendations saved with note and date

## 📊 Data Visualization

The insights section provides:
- Multi-metric trend line charts
- Mood distribution over time
- Activity performance analysis
- Participation vs prompts correlation
- Weekly and daily patterns
- Medication compliance tracking
- Progress scorecards

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run populate-pinecone` - Populate Pinecone with program data

### API Routes

- `GET /api/programs/adaptive` - Get historical recommendations
- `POST /api/programs/suggest` - Get note-level recommendations
- `GET /api/programs/recommendations` - Get stored recommendations
- `POST /api/notes` - Create a new note
- `GET /api/members/[id]/notes` - Get member's notes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 License

This project is private and proprietary.

## 🙏 Acknowledgments

- OpenAI for GPT-4 and embeddings API
- Pinecone for vector database services
- Supabase for backend infrastructure
- Next.js team for the amazing framework

## 📞 Support

For issues and questions, please contact the development team.

---

**Kibu Companion** - Intelligent Note-Taking for Care Providers

