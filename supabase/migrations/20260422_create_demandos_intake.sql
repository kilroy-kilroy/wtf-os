-- supabase/migrations/20260422_create_demandos_intake.sql

CREATE TABLE IF NOT EXISTS demandos_intake (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL UNIQUE REFERENCES client_enrollments(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS demandos_intake_enrollment_idx
  ON demandos_intake(enrollment_id);

ALTER TABLE demandos_intake ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own intake"
  ON demandos_intake FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_enrollments
      WHERE client_enrollments.id = demandos_intake.enrollment_id
        AND client_enrollments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own intake"
  ON demandos_intake FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM client_enrollments
      WHERE client_enrollments.id = demandos_intake.enrollment_id
        AND client_enrollments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own intake"
  ON demandos_intake FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM client_enrollments
      WHERE client_enrollments.id = demandos_intake.enrollment_id
        AND client_enrollments.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION set_demandos_intake_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS demandos_intake_updated_at_trigger ON demandos_intake;
CREATE TRIGGER demandos_intake_updated_at_trigger
  BEFORE UPDATE ON demandos_intake
  FOR EACH ROW EXECUTE FUNCTION set_demandos_intake_updated_at();
