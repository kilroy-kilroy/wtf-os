-- Add markdown_response column to call_scores table
-- This stores the full markdown report from the new Lite/Pro prompts

ALTER TABLE call_scores
ADD COLUMN IF NOT EXISTS markdown_response TEXT;

COMMENT ON COLUMN call_scores.markdown_response IS 'Full markdown report from CallLab Lite/Pro analysis';
