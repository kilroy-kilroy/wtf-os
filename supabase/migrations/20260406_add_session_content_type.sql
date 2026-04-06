-- Add 'session' to client_content content_type CHECK constraint
ALTER TABLE client_content DROP CONSTRAINT IF EXISTS client_content_content_type_check;
ALTER TABLE client_content ADD CONSTRAINT client_content_content_type_check
  CHECK (content_type IN ('text', 'video', 'deck', 'pdf', 'link', 'session'));
