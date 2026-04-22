-- supabase/migrations/20260422_create_client_documents.sql

CREATE TABLE IF NOT EXISTS client_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES client_enrollments(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT,
  description TEXT,
  document_type TEXT NOT NULL DEFAULT 'file'
    CHECK (document_type IN ('file', 'link', 'text')),
  file_name TEXT,
  storage_path TEXT UNIQUE,
  file_url TEXT,
  external_url TEXT,
  content_body TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS client_documents_enrollment_idx
  ON client_documents(enrollment_id);
CREATE INDEX IF NOT EXISTS client_documents_category_idx
  ON client_documents(enrollment_id, category);

ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own documents"
  ON client_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_enrollments
      WHERE client_enrollments.id = client_documents.enrollment_id
        AND client_enrollments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own documents"
  ON client_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM client_enrollments
      WHERE client_enrollments.id = client_documents.enrollment_id
        AND client_enrollments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own documents"
  ON client_documents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM client_enrollments
      WHERE client_enrollments.id = client_documents.enrollment_id
        AND client_enrollments.user_id = auth.uid()
    )
  );
