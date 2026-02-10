-- Client Onboarding System Schema
-- Adds client portal, program management, 5-Minute Friday, and content library
-- Created: 2026-02-09

-- ============================================
-- 1. CLIENT PROGRAMS
-- ============================================
CREATE TABLE IF NOT EXISTS client_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    has_five_minute_friday BOOLEAN DEFAULT false,
    has_call_lab_pro BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed the programs
INSERT INTO client_programs (slug, name, description, has_five_minute_friday, has_call_lab_pro) VALUES
    ('agency-studio', 'Agency Studio', 'Core agency coaching program', true, false),
    ('agency-studio-plus', 'Agency Studio+', 'Advanced agency coaching with extended support', true, true),
    ('salesos-studio', 'SalesOS Studio', 'Individual sales coaching program', false, true),
    ('salesos-growth', 'SalesOS Growth', 'Growth-focused sales program', false, true),
    ('salesos-team', 'SalesOS Team', 'Team-based sales coaching', false, true),
    ('demandos-studio', 'DemandOS Studio', 'Demand generation coaching', false, false),
    ('demandos-growth', 'DemandOS Growth', 'Growth-focused demand gen program', false, false),
    ('demandos-team', 'DemandOS Team', 'Team-based demand gen coaching', false, false)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 2. CLIENT INVITES
-- ============================================
CREATE TABLE IF NOT EXISTS client_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    full_name TEXT,
    program_id UUID NOT NULL REFERENCES client_programs(id),
    role TEXT DEFAULT 'primary',  -- 'primary' or 'team_member'
    invited_by UUID REFERENCES auth.users(id),
    invite_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    accepted_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_client_invites_email ON client_invites(email);
CREATE INDEX idx_client_invites_token ON client_invites(invite_token);

-- ============================================
-- 3. CLIENT ENROLLMENTS (links users to programs)
-- ============================================
CREATE TABLE IF NOT EXISTS client_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES client_programs(id),
    company_id UUID,  -- References client_companies after onboarding
    role TEXT DEFAULT 'primary' CHECK (role IN ('primary', 'team_member')),
    leads_sales_calls BOOLEAN DEFAULT false,  -- Determines Call Lab Pro access
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
    onboarding_completed BOOLEAN DEFAULT false,
    timezone TEXT DEFAULT 'America/New_York',
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, program_id)
);

CREATE INDEX idx_client_enrollments_user ON client_enrollments(user_id);
CREATE INDEX idx_client_enrollments_program ON client_enrollments(program_id);

-- ============================================
-- 4. CLIENT COMPANIES (onboarding data - separate from main companies table)
-- ============================================
CREATE TABLE IF NOT EXISTS client_companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID NOT NULL REFERENCES client_enrollments(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    url TEXT,
    industry_niche TEXT,
    hq_location TEXT,
    founded INTEGER,
    team_size INTEGER,
    revenue_range TEXT CHECK (revenue_range IN (
        'Under $500k', '$500k-$1M', '$1M-$2M', '$2M-$5M', '$5M-$10M', '$10M+'
    )),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. CLIENT LEADERSHIP CONTACTS
-- ============================================
CREATE TABLE IF NOT EXISTS client_leadership_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES client_companies(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT CHECK (role IN (
        'CEO', 'Founder', 'Co-Founder', 'CRO', 'COO', 'CMO',
        'Partner', 'VP Sales', 'VP Operations', 'Other'
    )),
    email TEXT,
    linkedin_url TEXT,
    is_decision_maker BOOLEAN DEFAULT false,
    personality_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_client_leadership_company ON client_leadership_contacts(company_id);

-- ============================================
-- 6. CLIENT TEAM MEMBERS
-- ============================================
CREATE TABLE IF NOT EXISTS client_team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES client_companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT CHECK (role IN (
        'Account Manager', 'Media Buyer', 'Designer', 'Developer',
        'Copywriter', 'Strategist', 'Project Manager',
        'Analytics Specialist', 'SEO Specialist', 'Social Media Manager', 'Other'
    )),
    linkedin_url TEXT,
    strengths_notes TEXT,
    capacity_contribution_score INTEGER CHECK (capacity_contribution_score BETWEEN 1 AND 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_client_team_company ON client_team_members(company_id);

-- ============================================
-- 7. CLIENT SERVICES
-- ============================================
CREATE TABLE IF NOT EXISTS client_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES client_companies(id) ON DELETE CASCADE,
    service_name TEXT NOT NULL,
    description TEXT,
    price_range TEXT,
    delivery_model TEXT CHECK (delivery_model IN (
        'Retainer', 'Project', 'Hybrid', 'Performance', 'Other'
    )),
    delivery_constraints TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_client_services_company ON client_services(company_id);

-- ============================================
-- 8. CLIENT PORTFOLIO (their clients)
-- ============================================
CREATE TABLE IF NOT EXISTS client_portfolio (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES client_companies(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    industry TEXT,
    monthly_value DECIMAL(10,2),
    profitability_rating TEXT CHECK (profitability_rating IN ('Low', 'Medium', 'High')),
    fit_rating INTEGER CHECK (fit_rating BETWEEN 1 AND 10),
    duration_months INTEGER,
    churn_risk TEXT CHECK (churn_risk IN ('Low', 'Medium', 'High')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_client_portfolio_company ON client_portfolio(company_id);

-- ============================================
-- 9. CLIENT FINANCIALS
-- ============================================
CREATE TABLE IF NOT EXISTS client_financials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES client_companies(id) ON DELETE CASCADE,
    revenue DECIMAL(12,2),
    cost_of_delivery DECIMAL(12,2),
    operating_costs DECIMAL(12,2),
    target_revenue_goal DECIMAL(12,2),
    target_profit_goal DECIMAL(12,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 10. CLIENT SALES PROCESS
-- ============================================
CREATE TABLE IF NOT EXISTS client_sales_process (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES client_companies(id) ON DELETE CASCADE,
    main_lead_sources TEXT[],
    monthly_lead_volume INTEGER,
    request_to_meeting_rate DECIMAL(5,2),
    meeting_to_proposal_rate DECIMAL(5,2),
    proposal_to_close_rate DECIMAL(5,2),
    sales_process_description TEXT,
    outbound_tools TEXT[],
    sales_positioning_summary TEXT,
    visibility_score INTEGER CHECK (visibility_score BETWEEN 1 AND 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id)
);

-- ============================================
-- 11. CLIENT OPS CAPACITY
-- ============================================
CREATE TABLE IF NOT EXISTS client_ops_capacity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES client_companies(id) ON DELETE CASCADE,
    hours_available_per_week DECIMAL(6,2),
    hours_sold_per_week DECIMAL(6,2),
    biggest_bottlenecks TEXT,
    delivery_model TEXT,
    sop_quality_rating INTEGER CHECK (sop_quality_rating BETWEEN 1 AND 10),
    team_capacity_risk TEXT CHECK (team_capacity_risk IN ('Low', 'Medium', 'High')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id)
);

-- ============================================
-- 12. CLIENT COMPETITORS
-- ============================================
CREATE TABLE IF NOT EXISTS client_competitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES client_companies(id) ON DELETE CASCADE,
    competitor_name TEXT NOT NULL,
    url TEXT,
    positioning_summary TEXT,
    strengths TEXT,
    weaknesses TEXT,
    differentiation_opportunities TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_client_competitors_company ON client_competitors(company_id);

-- ============================================
-- 13. FIVE MINUTE FRIDAY SUBMISSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS five_minute_fridays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES client_enrollments(id) ON DELETE CASCADE,
    week_of DATE NOT NULL,  -- The Friday date this submission covers
    worked_on TEXT NOT NULL,         -- "What did I work on this week?"
    working_on_next TEXT NOT NULL,   -- "What am I going to work on next week?"
    concerned_about TEXT,            -- "What am I concerned about?"
    happy_about TEXT,                -- "What am I happy about?"
    whats_in_the_way TEXT,           -- "What's in the way?"
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, week_of)
);

CREATE INDEX idx_five_minute_fridays_user ON five_minute_fridays(user_id);
CREATE INDEX idx_five_minute_fridays_enrollment ON five_minute_fridays(enrollment_id);
CREATE INDEX idx_five_minute_fridays_week ON five_minute_fridays(week_of);

-- ============================================
-- 14. FIVE MINUTE FRIDAY RESPONSES (admin)
-- ============================================
CREATE TABLE IF NOT EXISTS five_minute_friday_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    friday_id UUID NOT NULL REFERENCES five_minute_fridays(id) ON DELETE CASCADE,
    responder_id UUID REFERENCES auth.users(id),  -- Admin who responded
    response_text TEXT NOT NULL,
    email_sent BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_friday_responses_friday ON five_minute_friday_responses(friday_id);

-- ============================================
-- 15. CLIENT CONTENT LIBRARY
-- ============================================
CREATE TABLE IF NOT EXISTS client_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    content_type TEXT NOT NULL CHECK (content_type IN ('text', 'video', 'deck', 'pdf', 'link')),
    content_url TEXT,        -- URL for video/deck/pdf/link
    content_body TEXT,       -- Rich text content for 'text' type
    thumbnail_url TEXT,
    program_ids UUID[] DEFAULT '{}',  -- Which programs can see this (empty = all)
    sort_order INTEGER DEFAULT 0,
    published BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_client_content_published ON client_content(published);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Client enrollments: users see their own
ALTER TABLE client_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own enrollments" ON client_enrollments
    FOR SELECT USING (auth.uid() = user_id);

-- Client companies: users see their enrollment's company
ALTER TABLE client_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their company" ON client_companies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM client_enrollments
            WHERE client_enrollments.id = client_companies.enrollment_id
            AND client_enrollments.user_id = auth.uid()
        )
    );

-- Five minute fridays: users see their own
ALTER TABLE five_minute_fridays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own fridays" ON five_minute_fridays
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own fridays" ON five_minute_fridays
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Friday responses: users see responses to their fridays
ALTER TABLE five_minute_friday_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view responses to their fridays" ON five_minute_friday_responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM five_minute_fridays
            WHERE five_minute_fridays.id = five_minute_friday_responses.friday_id
            AND five_minute_fridays.user_id = auth.uid()
        )
    );

-- Client content: authenticated users with active enrollment can view published content
ALTER TABLE client_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enrolled clients can view published content" ON client_content
    FOR SELECT USING (
        published = true AND (
            program_ids = '{}' OR
            EXISTS (
                SELECT 1 FROM client_enrollments
                WHERE client_enrollments.user_id = auth.uid()
                AND client_enrollments.status = 'active'
                AND client_enrollments.program_id = ANY(client_content.program_ids)
            )
        )
    );

-- Updated_at triggers
CREATE TRIGGER update_client_companies_updated_at BEFORE UPDATE ON client_companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_client_enrollments_updated_at BEFORE UPDATE ON client_enrollments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_client_content_updated_at BEFORE UPDATE ON client_content FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_friday_responses_updated_at BEFORE UPDATE ON five_minute_friday_responses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
