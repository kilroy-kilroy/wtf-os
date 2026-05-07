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
  service_description: z.string().min(10, 'A sentence or two — what do you sell?'),
  customer_description: z.string().min(10, 'A sentence or two — who do you sell to?'),
  revenue_band: z.enum(['<$1M', '$1M-$3M', '$3M-$5M', '$5M-$10M', '$10M+']),
  affordability_answer: z.enum(['yes', 'no', 'not_sure']),
  newsletter_opt_in: z.boolean(),
});

type IntakeData = z.infer<typeof intakeSchema>;

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
      <main className="min-h-screen bg-background text-foreground">
        <section className="mx-auto max-w-3xl px-6 py-24">
          <p className="text-sm uppercase tracking-wider text-accent mb-4">
            Free Assessment · 5 minutes
          </p>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
            Most agency CEOs think a BD hire creates deals.
            <br />
            <span className="text-accent">They don't. They follow up leads.</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Are you ready to feed one? Take the 5-minute diagnostic.
            We'll analyze your website, your LinkedIn, and your answers — then tell you straight whether you're ready to hire, what you'll need to fix first, and how to actually make the hire stick.
          </p>
          <button
            onClick={() => setStep('intake')}
            className="rounded-full bg-foreground text-background px-8 py-4 text-lg font-semibold hover:opacity-90 transition"
          >
            Start the Assessment →
          </button>
        </section>
      </main>
    );
  }

  if (step === 'intake') {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <form onSubmit={handleIntakeSubmit} className="mx-auto max-w-2xl px-6 py-12 space-y-6">
          <h2 className="text-3xl font-bold">Tell me about your agency</h2>
          <p className="text-muted-foreground">
            I'll analyze your website + LinkedIn alongside your answers.
            Three minutes, then 10 quick questions.
          </p>

          {[
            { key: 'name', label: 'Your name', type: 'text' },
            { key: 'email', label: 'Email', type: 'email' },
            { key: 'company_name', label: 'Agency name', type: 'text' },
            { key: 'website_url', label: 'Agency website (https://)', type: 'url' },
            { key: 'linkedin_url', label: 'Your LinkedIn profile URL', type: 'url' },
          ].map(({ key, label, type }) => (
            <div key={key}>
              <label className="block text-sm font-medium mb-1">{label}</label>
              <input
                type={type}
                value={(intakeData as Record<string, string>)[key] ?? ''}
                onChange={(e) => setIntakeData(d => ({ ...d, [key]: e.target.value }))}
                className="w-full rounded border border-border bg-background px-3 py-2"
                required
              />
              {intakeErrors[key] && <p className="text-sm text-red-500 mt-1">{intakeErrors[key]}</p>}
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium mb-1">What do you sell? (1–2 sentences)</label>
            <textarea
              value={intakeData.service_description ?? ''}
              onChange={(e) => setIntakeData(d => ({ ...d, service_description: e.target.value }))}
              rows={3}
              className="w-full rounded border border-border bg-background px-3 py-2"
              required
            />
            {intakeErrors.service_description && <p className="text-sm text-red-500 mt-1">{intakeErrors.service_description}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Who do you sell to? (1–2 sentences)</label>
            <textarea
              value={intakeData.customer_description ?? ''}
              onChange={(e) => setIntakeData(d => ({ ...d, customer_description: e.target.value }))}
              rows={3}
              className="w-full rounded border border-border bg-background px-3 py-2"
              required
            />
            {intakeErrors.customer_description && <p className="text-sm text-red-500 mt-1">{intakeErrors.customer_description}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Annual revenue band</label>
            <select
              value={intakeData.revenue_band ?? ''}
              onChange={(e) => setIntakeData(d => ({ ...d, revenue_band: e.target.value as IntakeData['revenue_band'] }))}
              className="w-full rounded border border-border bg-background px-3 py-2"
              required
            >
              <option value="" disabled>Pick one</option>
              <option value="<$1M">Less than $1M</option>
              <option value="$1M-$3M">$1M – $3M</option>
              <option value="$3M-$5M">$3M – $5M</option>
              <option value="$5M-$10M">$5M – $10M</option>
              <option value="$10M+">$10M+</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Could you fund $60K base salary for 4–6 months without expecting any return?
            </label>
            <div className="space-y-1">
              {[
                { v: 'yes', l: 'Yes — I have the runway and I get the math.' },
                { v: 'no', l: 'No — that would put real strain on the business.' },
                { v: 'not_sure', l: "I'd have to model it." },
              ].map(({ v, l }) => (
                <label key={v} className="flex items-start gap-2">
                  <input
                    type="radio"
                    name="affordability"
                    value={v}
                    checked={intakeData.affordability_answer === v}
                    onChange={() => setIntakeData(d => ({ ...d, affordability_answer: v as IntakeData['affordability_answer'] }))}
                    required
                  />
                  <span>{l}</span>
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={intakeData.newsletter_opt_in ?? false}
              onChange={(e) => setIntakeData(d => ({ ...d, newsletter_opt_in: e.target.checked }))}
            />
            <span className="text-sm">Get Tim's newsletter — agency growth, no fluff.</span>
          </label>

          <button
            type="submit"
            className="rounded-full bg-foreground text-background px-8 py-3 font-semibold hover:opacity-90"
          >
            Continue to questions →
          </button>
        </form>
      </main>
    );
  }

  if (step === 'questions') {
    const q = BIZ_DEV_QUESTIONS[currentQ];
    const total = BIZ_DEV_QUESTIONS.length;
    const progress = ((currentQ) / total) * 100;

    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-2xl px-6 py-12">
          <div className="mb-8">
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>Question {currentQ + 1} of {total}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1 bg-border rounded">
              <div className="h-1 bg-accent rounded transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <h2 className="text-2xl font-semibold mb-8">{q.prompt}</h2>

          <div className="space-y-3">
            {q.choices.map((c) => (
              <button
                key={c.id}
                onClick={() => handleAnswer(q.id, c.id as 'a'|'b'|'c'|'d')}
                className="block w-full text-left rounded border border-border bg-card hover:border-accent hover:bg-accent/5 px-5 py-4 transition"
              >
                {c.text}
              </button>
            ))}
          </div>

          {currentQ > 0 && (
            <button
              onClick={() => setCurrentQ(currentQ - 1)}
              className="mt-8 text-sm text-muted-foreground hover:text-foreground"
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
      return <main className="p-12">Computing your verdict...</main>;
    }

    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-2xl px-6 py-16 text-center">
          <p className="text-sm uppercase tracking-wider text-accent mb-2">Your stage</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            You're at the <span className="text-accent">{previewResult.stage}</span> stage.
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Composite readiness: {previewResult.composite}/100
          </p>

          <div className="bg-card border border-border rounded-lg p-6 mb-8 text-left">
            <h2 className="font-semibold mb-3">Your two biggest gaps right now:</h2>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              {previewResult.topGaps.map(g => <li key={g}>{g}</li>)}
            </ul>
          </div>

          <div className="bg-accent/5 border border-accent/20 rounded-lg p-6 text-left">
            <p className="font-semibold mb-2">📨 Your full personalized report is being prepared.</p>
            <p className="text-muted-foreground text-sm">
              I'm analyzing your website and LinkedIn alongside your answers to find the specific gaps you need to fix. Check your inbox in ~5 minutes for the secure link to your full report.
            </p>
          </div>

          {submitting && (
            <p className="text-sm text-muted-foreground mt-6">Processing... feel free to close this tab.</p>
          )}
        </div>
      </main>
    );
  }

  return null;
}
