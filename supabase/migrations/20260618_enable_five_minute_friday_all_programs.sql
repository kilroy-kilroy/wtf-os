-- supabase/migrations/20260618_enable_five_minute_friday_all_programs.sql
-- Enable Five Minute Fridays for clients in ANY program.
-- Previously only Agency Studio / Agency Studio+ had has_five_minute_friday = true.

-- Turn 5MF on for every existing program.
UPDATE client_programs
   SET has_five_minute_friday = TRUE
 WHERE has_five_minute_friday = FALSE;

-- New programs created from now on get 5MF by default (was FALSE).
ALTER TABLE client_programs
  ALTER COLUMN has_five_minute_friday SET DEFAULT TRUE;
