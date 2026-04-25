-- Consolidated fixup for the DemandOS client intake feature.
-- Idempotent: brings remote DB to correct end-state regardless of partial prior state.
-- Replaces the 4 same-prefix `20260422_*` migrations that couldn't apply due to
-- Supabase's per-prefix unique constraint on schema_migrations.

-- ============================================================================
-- 1. client_documents — table may already exist with old schema; add missing columns
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES client_enrollments(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT,
  description TEXT,
  document_type TEXT NOT NULL DEFAULT 'file',
  file_name TEXT,
  storage_path TEXT,
  file_url TEXT,
  external_url TEXT,
  content_body TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add columns that may be missing on a pre-existing table.
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS size_bytes BIGINT;
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS document_type TEXT NOT NULL DEFAULT 'file';

-- Enforce document_type domain. Drop first in case constraint exists with different definition.
ALTER TABLE client_documents DROP CONSTRAINT IF EXISTS client_documents_document_type_check;
ALTER TABLE client_documents
  ADD CONSTRAINT client_documents_document_type_check
  CHECK (document_type IN ('file', 'link', 'text'));

-- Unique index on storage_path (only when populated). Use partial index to allow NULLs.
DROP INDEX IF EXISTS client_documents_storage_path_unique;
CREATE UNIQUE INDEX client_documents_storage_path_unique
  ON client_documents(storage_path) WHERE storage_path IS NOT NULL;

CREATE INDEX IF NOT EXISTS client_documents_enrollment_idx
  ON client_documents(enrollment_id);
CREATE INDEX IF NOT EXISTS client_documents_category_idx
  ON client_documents(enrollment_id, category);

ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own documents" ON client_documents;
CREATE POLICY "Users can view their own documents"
  ON client_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_enrollments
      WHERE client_enrollments.id = client_documents.enrollment_id
        AND client_enrollments.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert their own documents" ON client_documents;
CREATE POLICY "Users can insert their own documents"
  ON client_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM client_enrollments
      WHERE client_enrollments.id = client_documents.enrollment_id
        AND client_enrollments.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete their own documents" ON client_documents;
CREATE POLICY "Users can delete their own documents"
  ON client_documents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM client_enrollments
      WHERE client_enrollments.id = client_documents.enrollment_id
        AND client_enrollments.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 2. client-documents Storage bucket — exists with wrong settings; correct + add policies
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('client-documents', 'client-documents', false, 20971520)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit;

DROP POLICY IF EXISTS "Users can read own client documents" ON storage.objects;
CREATE POLICY "Users can read own client documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'client-documents'
    AND EXISTS (
      SELECT 1 FROM client_enrollments
      WHERE client_enrollments.id::text = (storage.foldername(name))[1]
        AND client_enrollments.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can upload own client documents" ON storage.objects;
CREATE POLICY "Users can upload own client documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'client-documents'
    AND EXISTS (
      SELECT 1 FROM client_enrollments
      WHERE client_enrollments.id::text = (storage.foldername(name))[1]
        AND client_enrollments.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own client documents" ON storage.objects;
CREATE POLICY "Users can delete own client documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'client-documents'
    AND EXISTS (
      SELECT 1 FROM client_enrollments
      WHERE client_enrollments.id::text = (storage.foldername(name))[1]
        AND client_enrollments.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 3. demandos_intake — new table
-- ============================================================================

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

DROP POLICY IF EXISTS "Users can view own intake" ON demandos_intake;
CREATE POLICY "Users can view own intake"
  ON demandos_intake FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_enrollments
      WHERE client_enrollments.id = demandos_intake.enrollment_id
        AND client_enrollments.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own intake" ON demandos_intake;
CREATE POLICY "Users can insert own intake"
  ON demandos_intake FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM client_enrollments
      WHERE client_enrollments.id = demandos_intake.enrollment_id
        AND client_enrollments.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own intake" ON demandos_intake;
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

-- ============================================================================
-- 4. merge_demandos_intake_answer RPC — atomic JSONB merge for autosave
-- ============================================================================

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
