-- User acquisition reporting view
-- Provides a simple view of all Call Lab reports for tracking user acquisition

CREATE OR REPLACE VIEW user_acquisition_report AS
SELECT
  user_id,
  buyer_name,
  company_name,
  overall_score,
  created_at
FROM call_lab_reports
ORDER BY created_at DESC;

-- Grant access to authenticated users (adjust as needed)
GRANT SELECT ON user_acquisition_report TO authenticated;

-- Comment
COMMENT ON VIEW user_acquisition_report IS 'User acquisition report showing Call Lab usage';
