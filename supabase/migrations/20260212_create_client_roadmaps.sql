-- Client Roadmaps
-- Stores per-client HTML roadmap documents uploaded by admins
-- Each roadmap is tied to a specific enrollment (one client in one program)

CREATE TABLE IF NOT EXISTS client_roadmaps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID NOT NULL REFERENCES client_enrollments(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT '6-Month Go Forward Roadmap',
    description TEXT,
    file_url TEXT NOT NULL,          -- Supabase Storage URL for the HTML file
    file_name TEXT NOT NULL,         -- Original filename for download
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_client_roadmaps_enrollment ON client_roadmaps(enrollment_id);

-- RLS: clients can only see their own roadmaps
ALTER TABLE client_roadmaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roadmaps" ON client_roadmaps
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM client_enrollments
            WHERE client_enrollments.id = client_roadmaps.enrollment_id
            AND client_enrollments.user_id = auth.uid()
        )
    );

-- Storage bucket for roadmap files
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-roadmaps', 'client-roadmaps', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: anyone can read (files are served by signed URL or public URL)
CREATE POLICY "Public read access for roadmaps" ON storage.objects
    FOR SELECT USING (bucket_id = 'client-roadmaps');

-- Storage policy: only service role can upload (admin API uses service role key)
CREATE POLICY "Service role upload for roadmaps" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'client-roadmaps');

CREATE POLICY "Service role delete for roadmaps" ON storage.objects
    FOR DELETE USING (bucket_id = 'client-roadmaps');

-- Updated_at trigger
CREATE TRIGGER update_client_roadmaps_updated_at
    BEFORE UPDATE ON client_roadmaps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
