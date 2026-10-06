-- Apply before deploying Labs access guards. No historical reports are deleted.
BEGIN;
CREATE TABLE public.lab_access_grants (
 kind text NOT NULL CHECK (kind IN ('ingestion','call','discovery','instant')),
 resource_id text NOT NULL, token_hash text NOT NULL,
 expires_at timestamptz NOT NULL, revoked_at timestamptz,
 PRIMARY KEY(kind,resource_id,token_hash)
);
ALTER TABLE public.lab_access_grants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lab_access_grants FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.lab_access_grants TO service_role;
CREATE TABLE public.lab_usage_limits (key text NOT NULL, day date NOT NULL, count integer NOT NULL, PRIMARY KEY(key,day));
ALTER TABLE public.lab_usage_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lab_usage_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.lab_usage_limits TO service_role;
CREATE FUNCTION public.consume_lab_quota(p_key text, p_limit integer) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE used integer;
BEGIN
 IF p_limit < 1 OR p_limit > 10000 THEN RETURN false; END IF;
 INSERT INTO lab_usage_limits(key,day,count) VALUES(p_key,(now() AT TIME ZONE 'UTC')::date,1)
 ON CONFLICT(key,day) DO UPDATE SET count=lab_usage_limits.count+1
 WHERE lab_usage_limits.count < p_limit RETURNING count INTO used;
 RETURN used IS NOT NULL;
END $$;
REVOKE ALL ON FUNCTION public.consume_lab_quota(text,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_lab_quota(text,integer) TO service_role;

-- Replace permissive/agency/email policies for private Lab data with owner reads.
DO $$ DECLARE t text; p record; BEGIN
 FOREACH t IN ARRAY ARRAY['ingestion_items','call_scores','call_lab_reports','discovery_briefs','coaching_reports','tool_runs'] LOOP
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
   EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,t);
  END LOOP;
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated',t);
  EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
  EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
  EXECUTE format('CREATE POLICY labs_owner_read ON public.%I FOR SELECT TO authenticated USING (user_id = auth.uid())',t);
 END LOOP;
END $$;
GRANT UPDATE(outcome,outcome_updated_at,discovery_brief_id) ON public.call_lab_reports TO authenticated;
CREATE POLICY labs_owner_update ON public.call_lab_reports FOR UPDATE TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());

-- Existing profile RLS remains; billing/admin fields are server-managed even
-- on initial INSERT. Ordinary onboarding fields keep their existing behavior.
CREATE FUNCTION public.guard_lab_privileges() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$
DECLARE key text; before_value jsonb;
BEGIN
 IF current_user IN ('postgres','service_role','supabase_admin') THEN RETURN NEW; END IF;
 FOREACH key IN ARRAY ARRAY['id','is_admin','call_lab_tier','discovery_lab_tier','visibility_lab_tier','subscription_tier'] LOOP
  before_value := CASE WHEN TG_OP='INSERT' THEN NULL ELSE to_jsonb(OLD)->key END;
  IF key='id' AND TG_OP='INSERT' THEN CONTINUE; END IF;
  IF TG_OP='UPDATE' AND (to_jsonb(NEW)->key) IS DISTINCT FROM before_value THEN
   RAISE EXCEPTION 'Profile privilege fields are server-managed';
  ELSIF TG_OP='INSERT' AND coalesce(to_jsonb(NEW)->>key,'') NOT IN ('','false','free','lead') THEN
   RAISE EXCEPTION 'Profile privilege fields are server-managed';
  END IF;
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER lab_profile_privileges BEFORE INSERT OR UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.guard_lab_privileges();
REVOKE INSERT, UPDATE, DELETE ON public.agencies, public.user_agency_assignments, public.subscriptions FROM anon, authenticated;
-- Instant reports are guest capabilities, never public database reads.
REVOKE ALL ON public.instant_reports FROM anon, authenticated;
REVOKE ALL ON public.instant_leads FROM anon, authenticated;
DO $$ DECLARE t text; p record; BEGIN
 FOREACH t IN ARRAY ARRAY['call_snippets','follow_up_templates'] LOOP
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
   EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,t);
  END LOOP;
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM anon,authenticated',t);
  EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
  EXECUTE format('CREATE POLICY labs_parent_owner ON public.%I FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.call_scores c WHERE c.id=call_score_id AND c.user_id=auth.uid()))',t);
 END LOOP;
END $$;
COMMIT;
