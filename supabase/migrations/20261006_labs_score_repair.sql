-- Recover only explicit /10 scores from saved Markdown. No model calls/emails.
BEGIN;
CREATE TABLE IF NOT EXISTS public.lab_score_repairs (
 call_score_id uuid PRIMARY KEY, previous_score numeric, repaired_score numeric NOT NULL,
 repaired_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lab_score_repairs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lab_score_repairs FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.lab_score_repairs TO service_role;
WITH parsed AS (
 SELECT id,overall_score,(regexp_match(replace(markdown_response,'*',''),'Score:\s*([0-9]+(?:\.[0-9]+)?)\s*/\s*10','i'))[1]::numeric AS recovered
 FROM public.call_scores WHERE markdown_response IS NOT NULL AND left(ltrim(markdown_response),1) <> '{'
)
INSERT INTO public.lab_score_repairs(call_score_id,previous_score,repaired_score)
SELECT id,overall_score,recovered FROM parsed WHERE recovered BETWEEN 0 AND 10 AND overall_score IS DISTINCT FROM recovered
ON CONFLICT(call_score_id) DO NOTHING;
UPDATE public.call_scores c SET overall_score=r.repaired_score
FROM public.lab_score_repairs r WHERE c.id=r.call_score_id AND c.overall_score IS NOT DISTINCT FROM r.previous_score;
COMMIT;
