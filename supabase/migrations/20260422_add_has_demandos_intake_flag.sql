-- supabase/migrations/20260422_add_has_demandos_intake_flag.sql

ALTER TABLE client_programs
  ADD COLUMN IF NOT EXISTS has_demandos_intake BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE client_programs
   SET has_demandos_intake = TRUE
 WHERE slug IN ('demandos-studio', 'demandos-growth', 'demandos-team');
