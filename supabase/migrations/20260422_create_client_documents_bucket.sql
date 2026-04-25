-- supabase/migrations/20260422_create_client_documents_bucket.sql

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('client-documents', 'client-documents', false, 20971520)
ON CONFLICT (id) DO UPDATE SET file_size_limit = EXCLUDED.file_size_limit;

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
