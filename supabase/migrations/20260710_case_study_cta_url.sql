-- Live CTA: the agency's booking/contact link. The web report + PDF link the
-- "Book a call" button to this; falls back to agency_url, then plain text.
alter table public.case_study_lab_reports
  add column if not exists cta_url text;
