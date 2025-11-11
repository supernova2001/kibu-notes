-- Create program_recommendations table for storing program suggestions
-- This table stores program recommendations generated from voice notes using RAG

CREATE TABLE IF NOT EXISTS program_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  note_id UUID REFERENCES notes(id) ON DELETE SET NULL,
  session_date TIMESTAMPTZ NOT NULL,
  programs JSONB NOT NULL DEFAULT '[]'::jsonb,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes for better query performance
  CONSTRAINT program_recommendations_member_id_fkey FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  CONSTRAINT program_recommendations_note_id_fkey FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE SET NULL
);

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_program_recommendations_member_id ON program_recommendations(member_id);
CREATE INDEX IF NOT EXISTS idx_program_recommendations_note_id ON program_recommendations(note_id);
CREATE INDEX IF NOT EXISTS idx_program_recommendations_session_date ON program_recommendations(session_date);
CREATE INDEX IF NOT EXISTS idx_program_recommendations_created_at ON program_recommendations(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE program_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Policy: Allow service role to do everything (for server-side operations)
-- This is handled automatically when using service role key

-- Policy: Allow authenticated users to read their own recommendations
CREATE POLICY "Users can read their own program recommendations"
  ON program_recommendations
  FOR SELECT
  USING (true); -- Adjust this based on your auth setup

-- Policy: Allow service role to insert (for API routes)
-- When using service role key, RLS is bypassed automatically
-- If using anon key, you may need to add a policy like:
-- CREATE POLICY "Allow service role to insert program recommendations"
--   ON program_recommendations
--   FOR INSERT
--   WITH CHECK (true);

-- Optional: Add a comment to document the table
COMMENT ON TABLE program_recommendations IS 'Stores program recommendations generated from voice notes using RAG (Retrieval-Augmented Generation). Each record links to a member, optionally to a note, and includes the suggested programs, keywords used for search, and timestamps.';

COMMENT ON COLUMN program_recommendations.programs IS 'JSONB array of recommended programs with fields: id, category, name, description, similarity, link, lifeSkills';
COMMENT ON COLUMN program_recommendations.keywords IS 'Array of keywords extracted from the voice note that were used to search for matching programs';
COMMENT ON COLUMN program_recommendations.session_date IS 'The date/time when the recommendations were generated (matches the note session date)';

