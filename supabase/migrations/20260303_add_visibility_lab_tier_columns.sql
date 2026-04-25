-- Add visibility_lab_tier column to users and agencies tables
-- Matches existing pattern: call_lab_tier, discovery_lab_tier
-- Values: 'free' | 'pro' (null means never accessed)

ALTER TABLE users
ADD COLUMN IF NOT EXISTS visibility_lab_tier TEXT;

ALTER TABLE agencies
ADD COLUMN IF NOT EXISTS visibility_lab_tier TEXT;
