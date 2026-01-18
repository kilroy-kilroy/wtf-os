-- Add discovery_brief_id to call_lab_reports to link calls to discovery briefs
-- This enables tracking pipeline: Discovery → Call → Outcome

ALTER TABLE call_lab_reports
ADD COLUMN IF NOT EXISTS discovery_brief_id uuid REFERENCES discovery_briefs(id);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_call_lab_reports_discovery_brief
ON call_lab_reports(discovery_brief_id)
WHERE discovery_brief_id IS NOT NULL;

-- Comment
COMMENT ON COLUMN call_lab_reports.discovery_brief_id IS 'Links this call to a discovery brief for pipeline tracking';
