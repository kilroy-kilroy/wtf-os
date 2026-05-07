'use client';

import { useState } from 'react';

type FlowStep = 'landing' | 'intake' | 'questions' | 'preview';

export default function BizDevAssessmentPage() {
  const [step, setStep] = useState<FlowStep>('landing');

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

  return <main className="p-12">Step: {step}</main>;
}
