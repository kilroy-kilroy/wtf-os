-- supabase/migrations/20260422_create_merge_demandos_intake_answer_rpc.sql
-- Atomic merge of one key into demandos_intake.answers JSONB.
-- Eliminates the read-merge-write race on autosave.

CREATE OR REPLACE FUNCTION merge_demandos_intake_answer(
  p_enrollment_id UUID,
  p_key TEXT,
  p_value JSONB
) RETURNS VOID
LANGUAGE SQL
SECURITY INVOKER
AS $$
  UPDATE demandos_intake
     SET answers = answers || jsonb_build_object(p_key, p_value)
   WHERE enrollment_id = p_enrollment_id;
$$;
