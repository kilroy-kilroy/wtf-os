-- Agency co-branding: the case study asset now shows the agency (logo/name)
-- alongside the client. accent is the agency's chosen brand color (hex), the
-- source of truth for the report/card accent. All nullable — existing rows
-- fall back to scraped colors / no agency mark.

alter table public.case_study_lab_reports
  add column if not exists agency_name     text,
  add column if not exists agency_logo_url text,
  add column if not exists accent          text;
