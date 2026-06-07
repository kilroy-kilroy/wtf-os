-- One-time, short-lived password reset tokens for the client portal.
-- Service-role only (RLS enabled, no anon/authenticated policies).
-- Applied to project sthtvkcdahgsltwukirl via Supabase migration on 2026-06-07.
CREATE TABLE IF NOT EXISTS client_password_resets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_client_password_resets_token ON client_password_resets(token);
CREATE INDEX IF NOT EXISTS idx_client_password_resets_user ON client_password_resets(user_id);

ALTER TABLE client_password_resets ENABLE ROW LEVEL SECURITY;
-- Intentionally NO policies: only the service-role key (which bypasses RLS) touches this table.
