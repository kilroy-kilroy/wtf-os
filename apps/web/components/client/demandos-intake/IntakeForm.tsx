// apps/web/components/client/demandos-intake/IntakeForm.tsx
'use client';

import { useState, useMemo, useRef } from 'react';
import { SECTIONS, QUESTIONS, requiredKeys, questionsBySection } from '@/lib/demandos-intake/questions';
import QuestionField from './QuestionField';
import SectionNav from './SectionNav';
import type { ExistingDoc } from '@/components/client/DocumentUploadSlot';

type Props = {
  initialAnswers: Record<string, unknown>;
  initialDocuments: ExistingDoc[];
  submittedAt: string | null;
  readOnly?: boolean;
};

export default function IntakeForm({
  initialAnswers, initialDocuments, submittedAt, readOnly,
}: Props) {
  const [answers, setAnswers] = useState<Record<string, unknown>>(initialAnswers);
  const [documents, setDocuments] = useState<ExistingDoc[]>(initialDocuments);
  const [activeSection, setActiveSection] = useState<string>(SECTIONS[0].slug);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<boolean>(submittedAt !== null);

  // Shadow ref kept synchronous-with-state so persistBlur always reads the
  // latest value, even when called in the same event tick as saveOne.
  const answersRef = useRef<Record<string, unknown>>(initialAnswers);

  const questionsInSection = useMemo(() => questionsBySection(activeSection), [activeSection]);

  function saveOne(key: string, value: unknown) {
    if (readOnly || submitted) return;
    answersRef.current = { ...answersRef.current, [key]: value };
    setAnswers(answersRef.current);
  }

  async function persistBlur(key: string) {
    if (readOnly || submitted) return;
    const value = answersRef.current[key];
    const res = await fetch('/api/client/demandos-intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) {
      console.error('Autosave failed for', key);
    }
  }

  function onDocumentsChange(category: string, next: ExistingDoc[]) {
    setDocuments((prev) => [
      ...prev.filter((d) => d.category !== category),
      ...next,
    ]);
  }

  async function handleSubmit() {
    const missing = requiredKeys().filter((k) => {
      const v = answersRef.current[k];
      return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
    });
    if (missing.length > 0) {
      const firstMissing = QUESTIONS.find((q) => q.key === missing[0]);
      if (firstMissing) setActiveSection(firstMissing.section);
      alert(`${missing.length} required question${missing.length === 1 ? '' : 's'} still open. Please complete all required fields (marked with *).`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/client/demandos-intake/submit', { method: 'POST' });
      const body = await res.json();
      if (!res.ok) {
        alert('Submit failed: ' + (body.error ?? 'unknown'));
        return;
      }
      setSubmitted(true);
      alert('Thank you. Your intake has been submitted.');
    } finally {
      setSubmitting(false);
    }
  }

  const activeSectionMeta = SECTIONS.find((s) => s.slug === activeSection)!;
  const docsForCategory = (cat: string) => documents.filter((d) => d.category === cat);

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-[#333333] px-6 py-5">
        <h1 className="text-2xl font-anton uppercase text-[#E51B23]">Demand OS Intake</h1>
        <p className="text-xs text-gray-500 mt-1">
          {submitted ? 'Submitted — view only' : 'Your answers save automatically as you go.'}
        </p>
      </header>

      <div className="flex">
        <aside className="w-64 border-r border-[#333333] min-h-[calc(100vh-80px)] py-6">
          <SectionNav activeSlug={activeSection} onSelect={setActiveSection} answers={answers} />
        </aside>

        <main className="flex-1 px-10 py-8 max-w-3xl">
          <h2 className="text-xl font-anton uppercase mb-6">{activeSectionMeta.title}</h2>

          <div className="space-y-6">
            {questionsInSection.map((q) => (
              <QuestionField
                key={q.key}
                question={q}
                value={answers[q.key]}
                onChange={(v) => saveOne(q.key, v)}
                onBlur={() => persistBlur(q.key)}
                readOnly={readOnly || submitted}
                documents={q.uploadCategory ? docsForCategory(q.uploadCategory) : undefined}
                onDocumentsChange={q.type === 'upload' && q.uploadCategory
                  ? (next) => onDocumentsChange(q.uploadCategory!, next)
                  : undefined}
              />
            ))}
          </div>

          <div className="flex items-center justify-between mt-10 pt-6 border-t border-[#333333]">
            <button
              type="button"
              disabled={SECTIONS.findIndex((s) => s.slug === activeSection) === 0}
              onClick={() => {
                const i = SECTIONS.findIndex((s) => s.slug === activeSection);
                if (i > 0) setActiveSection(SECTIONS[i - 1].slug);
              }}
              className="text-xs uppercase tracking-wider text-gray-400 disabled:opacity-30"
            >
              ← Prev
            </button>

            {activeSection === SECTIONS[SECTIONS.length - 1].slug ? (
              !submitted && !readOnly && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmit}
                  className="bg-[#E51B23] text-white px-6 py-3 text-sm font-bold uppercase tracking-wider disabled:opacity-50"
                >
                  {submitting ? 'Submitting…' : 'Submit Intake'}
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={() => {
                  const i = SECTIONS.findIndex((s) => s.slug === activeSection);
                  if (i < SECTIONS.length - 1) setActiveSection(SECTIONS[i + 1].slug);
                }}
                className="text-xs uppercase tracking-wider text-white"
              >
                Next →
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
