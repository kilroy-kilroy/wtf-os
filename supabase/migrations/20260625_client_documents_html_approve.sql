-- 20260625_client_documents_html_approve.sql
-- Adds HTML document support + lightweight in-portal approval to client_documents.

-- 1. Allow document_type = 'html'
ALTER TABLE client_documents DROP CONSTRAINT IF EXISTS client_documents_document_type_check;
ALTER TABLE client_documents
  ADD CONSTRAINT client_documents_document_type_check
  CHECK (document_type IN ('file', 'link', 'text', 'html'));

-- 2. Approval + view-tracking columns
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS approved_name TEXT;
