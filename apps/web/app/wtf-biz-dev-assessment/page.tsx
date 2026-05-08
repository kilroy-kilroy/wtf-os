'use client';

import { useState } from 'react';
import { z } from 'zod';
import { BIZ_DEV_QUESTIONS, scoreBizDevAssessment, type AssessmentAnswers, type QuestionId } from '@repo/utils';

type FlowStep = 'landing' | 'intake' | 'questions' | 'preview';

const intakeSchema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email('Valid email required'),
  company_name: z.string().min(1, 'Required'),
  website_url: z.string().url('Must be a valid URL (include https://)'),
  linkedin_url: z.string().url('Must be a valid LinkedIn URL').refine(
    (v) => v.includes('linkedin.com'),
    'Must be a LinkedIn URL'
  ),
  service_description: z.string().min(10, 'A sentence or two. What do you sell?'),
  customer_description: z.string().min(10, 'A sentence or two. Who do you sell to?'),
  revenue_band: z.enum(['<$1M', '$1M-$3M', '$3M-$5M', '$5M-$10M', '$10M+']),
  affordability_answer: z.enum(['yes', 'no', 'not_sure']),
  newsletter_opt_in: z.boolean(),
});

type IntakeData = z.infer<typeof intakeSchema>;

const STAGE_LABELS = {
  all_founder_no_system: 'All Founder, No System',
  half_built_engine: 'Half-Built Engine',
  engine_online_hire_ready: 'Engine Online, Hire-Ready',
} as const;

const DIMENSION_LABELS = {
  lead_flow: 'Lead Flow',
  sales_process: 'Sales Process',
  icp_offer: 'ICP & Offer Clarity',
  founder_readiness: 'Founder Readiness',
  proof_enablement: 'Proof & Enablement',
} as const;

const inputClass =
  'w-full font-poppins bg-transparent border-0 border-b-2 border-foreground/20 px-0 py-3 text-lg ' +
  'focus:outline-none focus:border-brand placeholder:text-muted-foreground/60 transition-colors';

const labelClass = 'block font-poppins text-xs uppercase tracking-[0.2em] text-foreground/70 mb-1';

export default function BizDevAssessmentPage() {
  const [step, setStep] = useState<FlowStep>('landing');
  const [intakeData, setIntakeData] = useState<Partial<IntakeData>>({
    newsletter_opt_in: false,
  });
  const [intakeErrors, setIntakeErrors] = useState<Record<string, string>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Partial<AssessmentAnswers>>({});
  const [submitting, setSubmitting] = useState(false);
  const [previewResult, setPreviewResult] = useState<null | {
    verdict: string;
    stage: string;
    composite: number;
    topGaps: string[];
  }>(null);

  function handleAnswer(qId: QuestionId, choiceId: 'a' | 'b' | 'c' | 'd') {
    const next = { ...answers, [qId]: choiceId };
    setAnswers(next);
    if (currentQ < BIZ_DEV_QUESTIONS.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      submitAssessment(next as AssessmentAnswers);
    }
  }

  async function submitAssessment(finalAnswers: AssessmentAnswers) {
    setSubmitting(true);
    setStep('preview');

    const preview = scoreBizDevAssessment(finalAnswers);
    const stageDisplay = STAGE_LABELS[preview.stage];

    const dimEntries = Object.entries(preview.dimensions) as Array<[string, number]>;
    dimEntries.sort((a, b) => a[1] - b[1]);
    const topGaps = dimEntries.slice(0, 2).map(([d]) => DIMENSION_LABELS[d as keyof typeof DIMENSION_LABELS]);

    setPreviewResult({
      verdict: preview.verdict,
      stage: stageDisplay,
      composite: preview.composite,
      topGaps,
    });

    try {
      const resp = await fetch('/api/analyze/biz-dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intake: intakeData,
          answers: finalAnswers,
        }),
      });
      if (!resp.ok) {
        console.warn('Background processing failed:', await resp.text());
      }
    } catch (err) {
      console.warn('Background processing error:', err);
    } finally {
      setSubmitting(false);
    }
  }

  function handleIntakeSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = intakeSchema.safeParse(intakeData);
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        errors[issue.path[0] as string] = issue.message;
      }
      setIntakeErrors(errors);
      return;
    }
    setIntakeErrors({});
    setStep('questions');
  }

  if (step === 'landing') {
    return (
      <main className="min-h-screen bg-background text-foreground relative overflow-hidden">
        <div
          aria-hidden
          className="absolute -top-20 -right-20 font-anton text-brand/10 leading-none select-none pointer-events-none text-[30rem] hidden md:block"
        >
          BD?
        </div>
        <section className="relative mx-auto max-w-4xl px-6 py-24 md:py-32">
          <p className="font-poppins text-xs uppercase tracking-[0.3em] text-brand mb-6">
            Free diagnostic · 5 minutes
          </p>
          <h1 className="font-anton uppercase tracking-tight leading-[0.92] text-foreground mb-8 text-[clamp(2.75rem,8vw,6.5rem)]">
            Most agency CEOs<br />
            think a BD hire<br />
            <span className="text-brand">creates deals.</span>
          </h1>
          <p className="font-poppins text-xl md:text-2xl text-foreground/80 mb-3 max-w-2xl leading-snug">
            They don&apos;t create deals. They <em className="not-italic font-semibold text-foreground">follow up</em> leads.
          </p>
          <p className="font-poppins text-base md:text-lg text-muted-foreground mb-10 max-w-2xl">
            Are you ready to feed one? Take the 5-minute diagnostic. We&apos;ll analyze your website, your LinkedIn, and your answers. Then we&apos;ll tell you straight whether you&apos;re ready to hire, what you need to fix first, and how to actually make the hire stick.
          </p>
          <button
            onClick={() => setStep('intake')}
            className="group inline-flex items-center gap-3 bg-foreground text-background px-8 py-4 font-poppins font-semibold uppercase tracking-wider text-sm hover:bg-brand transition-colors"
          >
            Start the assessment
            <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
          </button>

          <ul className="mt-16 grid gap-6 md:grid-cols-3 border-t-2 border-foreground pt-8 max-w-3xl">
            {[
              ['10 questions', 'We ask about your sales engine, your ICP, and how the founder shows up.'],
              ['Live research', "We pull your website and LinkedIn while you fill out the form."],
              ['Brutally honest', "There's no diplomatic vagueness. You'll know what's broken."],
            ].map(([title, desc]) => (
              <li key={title}>
                <p className="font-anton uppercase text-foreground text-lg leading-tight">{title}</p>
                <p className="font-poppins text-sm text-muted-foreground mt-1">{desc}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
    );
  }

  if (step === 'intake') {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <form onSubmit={handleIntakeSubmit} className="mx-auto max-w-2xl px-6 py-16 md:py-20">
          <p className="font-poppins text-xs uppercase tracking-[0.3em] text-brand mb-4">Step 1 of 2</p>
          <h2 className="font-anton uppercase tracking-tight leading-[0.95] text-foreground mb-3 text-[clamp(2rem,5vw,3.5rem)]">
            Tell me about your agency.
          </h2>
          <p className="font-poppins text-base md:text-lg text-muted-foreground mb-12 max-w-xl">
            I&apos;ll analyze your website and LinkedIn alongside your answers. Three minutes here, then 10 quick questions.
          </p>

          <div className="space-y-8">
            {[
              { key: 'name', label: 'Your name', type: 'text', placeholder: 'First and last' },
              { key: 'email', label: 'Email', type: 'email', placeholder: 'you@youragency.com' },
              { key: 'company_name', label: 'Agency name', type: 'text', placeholder: '' },
              { key: 'website_url', label: 'Agency website', type: 'url', placeholder: 'https://' },
              { key: 'linkedin_url', label: 'Your LinkedIn URL', type: 'url', placeholder: 'https://linkedin.com/in/…' },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className={labelClass}>{label}</label>
                <input
                  type={type}
                  placeholder={placeholder}
                  value={(intakeData as Record<string, string>)[key] ?? ''}
                  onChange={(e) => setIntakeData(d => ({ ...d, [key]: e.target.value }))}
                  className={inputClass}
                  required
                />
                {intakeErrors[key] && <p className="font-poppins text-sm text-scorecard-fail mt-1">{intakeErrors[key]}</p>}
              </div>
            ))}

            <div>
              <label className={labelClass}>What do you sell? (1 or 2 sentences)</label>
              <textarea
                value={intakeData.service_description ?? ''}
                onChange={(e) => setIntakeData(d => ({ ...d, service_description: e.target.value }))}
                rows={3}
                className={inputClass + ' resize-none'}
                required
              />
              {intakeErrors.service_description && <p className="font-poppins text-sm text-scorecard-fail mt-1">{intakeErrors.service_description}</p>}
            </div>

            <div>
              <label className={labelClass}>Who do you sell to? (1 or 2 sentences)</label>
              <textarea
                value={intakeData.customer_description ?? ''}
                onChange={(e) => setIntakeData(d => ({ ...d, customer_description: e.target.value }))}
                rows={3}
                className={inputClass + ' resize-none'}
                required
              />
              {intakeErrors.customer_description && <p className="font-poppins text-sm text-scorecard-fail mt-1">{intakeErrors.customer_description}</p>}
            </div>

            <div>
              <label className={labelClass}>Annual revenue band</label>
              <select
                value={intakeData.revenue_band ?? ''}
                onChange={(e) => setIntakeData(d => ({ ...d, revenue_band: e.target.value as IntakeData['revenue_band'] }))}
                className={inputClass + ' appearance-none cursor-pointer'}
                required
              >
                <option value="" disabled>Pick one</option>
                <option value="<$1M">Less than $1M</option>
                <option value="$1M-$3M">$1M to $3M</option>
                <option value="$3M-$5M">$3M to $5M</option>
                <option value="$5M-$10M">$5M to $10M</option>
                <option value="$10M+">$10M+</option>
              </select>
            </div>

            <fieldset>
              <legend className={labelClass}>
                Can you afford to fund 4 to 6 months of a full-time business development resource without any return?
              </legend>
              <p className="font-poppins text-sm text-muted-foreground mt-2 mb-3 max-w-prose">
                For example, you should expect a sales hire on a USD $75K base salary to draw $25,000 to $38,000 in salary before they are able to close deals on their own.
              </p>
              <div className="space-y-2">
                {[
                  { v: 'yes', l: "Yes. I've got the runway and I get the math." },
                  { v: 'no', l: "No. That would put real strain on the business." },
                  { v: 'not_sure', l: "I'd have to model it." },
                ].map(({ v, l }) => {
                  const selected = intakeData.affordability_answer === v;
                  return (
                    <label
                      key={v}
                      className={[
                        'flex items-start gap-3 cursor-pointer border-2 px-4 py-3 transition-colors',
                        selected ? 'border-brand bg-brand/5' : 'border-foreground/15 hover:border-foreground/40',
                      ].join(' ')}
                    >
                      <input
                        type="radio"
                        name="affordability"
                        value={v}
                        checked={selected}
                        onChange={() => setIntakeData(d => ({ ...d, affordability_answer: v as IntakeData['affordability_answer'] }))}
                        className="mt-1 accent-brand"
                        required
                      />
                      <span className="font-poppins text-base">{l}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <label className="flex items-start gap-3 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={intakeData.newsletter_opt_in ?? false}
                onChange={(e) => setIntakeData(d => ({ ...d, newsletter_opt_in: e.target.checked }))}
                className="mt-1 accent-brand"
              />
              <span className="font-poppins text-sm text-muted-foreground">Get Tim&apos;s newsletter for agency growth without the fluff.</span>
            </label>

            <button
              type="submit"
              className="group inline-flex items-center gap-3 bg-foreground text-background px-8 py-4 font-poppins font-semibold uppercase tracking-wider text-sm hover:bg-brand transition-colors"
            >
              Continue to questions
              <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
            </button>
          </div>
        </form>
      </main>
    );
  }

  if (step === 'questions') {
    const q = BIZ_DEV_QUESTIONS[currentQ];
    const total = BIZ_DEV_QUESTIONS.length;
    const progress = ((currentQ) / total) * 100;
    const qNumPadded = String(currentQ + 1).padStart(2, '0');
    const totalPadded = String(total).padStart(2, '0');

    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-2xl px-6 py-12 md:py-20">
          <div className="mb-12">
            <div className="flex items-baseline justify-between mb-3">
              <span className="font-anton text-2xl tabular-nums text-foreground">
                Q{qNumPadded}<span className="text-muted-foreground"> / {totalPadded}</span>
              </span>
              <span className="font-poppins text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {Math.round(progress)}% complete
              </span>
            </div>
            <div className="h-1 bg-border">
              <div className="h-1 bg-brand transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <h2 className="font-anton uppercase tracking-tight leading-[1.0] text-foreground mb-10 text-[clamp(1.75rem,4vw,2.75rem)]">
            {q.prompt}
          </h2>

          <div className="space-y-3">
            {q.choices.map((c, i) => (
              <button
                key={c.id}
                onClick={() => handleAnswer(q.id, c.id as 'a'|'b'|'c'|'d')}
                className="group block w-full text-left border-2 border-foreground/15 bg-background hover:border-brand hover:bg-brand/5 px-5 py-4 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <span className="font-anton text-lg text-muted-foreground group-hover:text-brand transition-colors flex-shrink-0 w-6 tabular-nums">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="font-poppins text-base leading-snug">{c.text}</span>
                </div>
              </button>
            ))}
          </div>

          {currentQ > 0 && (
            <button
              onClick={() => setCurrentQ(currentQ - 1)}
              className="mt-10 font-poppins text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back
            </button>
          )}
        </div>
      </main>
    );
  }

  if (step === 'preview') {
    if (!previewResult) {
      return (
        <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-12">
          <p className="font-anton uppercase tracking-tight text-3xl">Computing your verdict…</p>
        </main>
      );
    }

    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-2xl px-6 py-16 md:py-24">
          <p className="font-poppins text-xs uppercase tracking-[0.3em] text-brand mb-4">Your stage</p>
          <h1 className="font-anton uppercase tracking-tight leading-[0.95] text-foreground mb-6 text-[clamp(2.5rem,7vw,5rem)]">
            You&apos;re at the<br />
            <span className="text-brand">{previewResult.stage}</span><br />
            stage.
          </h1>

          <div className="flex items-baseline gap-4 mb-12 border-y-2 border-foreground py-4">
            <span className="font-anton text-foreground tabular-nums leading-none text-[clamp(3.5rem,9vw,5.5rem)]">
              {previewResult.composite}
            </span>
            <span className="font-anton text-2xl text-muted-foreground">/100</span>
            <span className="font-poppins text-xs uppercase tracking-[0.2em] text-muted-foreground ml-auto">
              Composite readiness
            </span>
          </div>

          <div className="border-2 border-foreground p-6 md:p-8 mb-8">
            <p className="font-poppins text-xs uppercase tracking-[0.2em] text-brand mb-3">These are your two biggest gaps</p>
            <ul className="space-y-2">
              {previewResult.topGaps.map((g, i) => (
                <li key={g} className="flex items-baseline gap-3">
                  <span className="font-anton text-2xl text-brand tabular-nums">0{i + 1}</span>
                  <span className="font-anton uppercase text-2xl tracking-tight text-foreground">{g}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-foreground text-background p-6 md:p-8">
            <p className="font-poppins text-xs uppercase tracking-[0.25em] text-brand mb-3">Your email is coming</p>
            <p className="font-anton uppercase tracking-tight text-2xl md:text-3xl leading-tight mb-3">
              Your full personalized report is being prepared.
            </p>
            <p className="font-poppins text-sm md:text-base text-background/70">
              I&apos;m analyzing your website and LinkedIn alongside your answers to find the specific gaps you need to fix. Check your inbox in about 5 minutes for the secure link to your full report.
            </p>
          </div>

          {submitting && (
            <p className="font-poppins text-xs uppercase tracking-[0.2em] text-muted-foreground mt-8">
              We&apos;re still processing. Feel free to close this tab.
            </p>
          )}
        </div>
      </main>
    );
  }

  return null;
}
