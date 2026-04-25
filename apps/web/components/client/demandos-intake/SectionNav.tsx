// apps/web/components/client/demandos-intake/SectionNav.tsx
'use client';

import { SECTIONS, QUESTIONS } from '@/lib/demandos-intake/questions';

type Props = {
  activeSlug: string;
  onSelect: (slug: string) => void;
  answers: Record<string, unknown>;
};

function isAnswered(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export default function SectionNav({ activeSlug, onSelect, answers }: Props) {
  const completion = SECTIONS.map((s) => {
    const required = QUESTIONS.filter((q) => q.section === s.slug && q.required);
    if (required.length === 0) return { slug: s.slug, complete: true };
    const complete = required.every((q) => isAnswered(answers[q.key]));
    return { slug: s.slug, complete };
  });
  const statusBySlug = Object.fromEntries(completion.map((c) => [c.slug, c.complete]));

  return (
    <nav className="space-y-1">
      {SECTIONS.map((s) => {
        const active = s.slug === activeSlug;
        const complete = statusBySlug[s.slug];
        return (
          <button
            key={s.slug}
            type="button"
            onClick={() => onSelect(s.slug)}
            className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between border-l-2 ${
              active
                ? 'border-[#E51B23] bg-white/5 text-white'
                : 'border-transparent text-gray-400 hover:text-white hover:bg-white/[0.02]'
            }`}
          >
            <span>{s.title}</span>
            {complete && <span className="text-[#E51B23] text-xs">✓</span>}
          </button>
        );
      })}
    </nav>
  );
}
