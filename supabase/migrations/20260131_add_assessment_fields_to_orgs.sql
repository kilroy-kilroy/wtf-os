-- ============================================
-- Add assessment-sourced fields to orgs table
-- Enables product onboarding to pull from assessment data
-- ============================================

ALTER TABLE orgs ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS founder_linkedin_url text;
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS company_linkedin_url text;
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS company_revenue text;
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS annual_revenue numeric;
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS avg_client_value numeric;
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS client_count integer;
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS target_industry text;
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS target_company_size text;
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS target_market text;
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS core_offer text;
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS differentiator text;
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS enrichment_data jsonb;
