-- Combined MSA + SOW: a contract can attach a SOW schedule that is appended
-- after the base agreement into a single PDF / Firma envelope.
alter table public.contracts
  add column if not exists sow_template_id uuid references public.contract_templates(id);
