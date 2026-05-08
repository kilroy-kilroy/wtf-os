'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ComponentPropsWithoutRef } from 'react';

interface Props {
  markdown: string;
  ctaTier: 'studio' | 'growth';
  assessmentId: string;
  dimensions: Record<string, number>;
  compositeScore: number;
}

const STUDIO_BOOKING_URL = process.env.NEXT_PUBLIC_STUDIO_BOOKING_URL ?? 'https://timkilroy.com/book/studio';
const GROWTH_BOOKING_URL = process.env.NEXT_PUBLIC_GROWTH_BOOKING_URL ?? 'https://timkilroy.com/book/growth';

const DIMENSION_LABELS: Record<string, string> = {
  lead_flow: 'Lead Flow',
  sales_process: 'Sales Process',
  icp_offer: 'ICP & Offer Clarity',
  founder_readiness: 'Founder Readiness',
  proof_enablement: 'Proof & Enablement',
};

const DIMENSION_ORDER = ['lead_flow', 'sales_process', 'icp_offer', 'founder_readiness', 'proof_enablement'];

function scoreBand(score: number): { token: 'fail' | 'warn' | 'pass'; label: string } {
  if (score >= 70) return { token: 'pass', label: 'Strong' };
  if (score >= 40) return { token: 'warn', label: 'Soft spot' };
  return { token: 'fail', label: 'Critical gap' };
}

/** Top-of-report scorecard. Big composite numeral + five dimension bars. */
function ScoreSummary({ dimensions, composite }: { dimensions: Record<string, number>; composite: number }) {
  const compositeBand = scoreBand(composite);
  return (
    <section
      aria-label="Score summary"
      className="not-prose mb-16 grid gap-10 md:grid-cols-[auto_1fr] items-start border-y-2 border-foreground py-8"
    >
      <div className="flex items-baseline gap-4">
        <div className="font-anton text-foreground leading-none text-[clamp(5rem,16vw,9rem)] tabular-nums">
          {composite}
        </div>
        <div className="pb-2">
          <div className="font-anton text-2xl text-muted-foreground leading-none">/100</div>
          <div className={`font-poppins text-xs uppercase tracking-[0.2em] mt-2 text-scorecard-${compositeBand.token}`}>
            Composite · {compositeBand.label}
          </div>
        </div>
      </div>

      <ul className="grid gap-3" aria-label="Dimension scores">
        {DIMENSION_ORDER.map((key) => {
          const score = dimensions[key] ?? 0;
          const { token } = scoreBand(score);
          const label = DIMENSION_LABELS[key] ?? key;
          return (
            <li key={key} className="grid grid-cols-[1fr_auto] gap-3 items-center">
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="font-poppins text-xs uppercase tracking-wider text-foreground font-semibold">{label}</span>
                  <span className={`font-anton text-lg tabular-nums text-scorecard-${token}`}>
                    {score}<span className="text-muted-foreground text-xs ml-1 font-poppins">/100</span>
                  </span>
                </div>
                <div className="h-1.5 bg-muted relative overflow-hidden rounded-full">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full bg-scorecard-${token}`}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Detect headings like "Lead Flow: 25/100" (or with em-dash from older reports) and render as a scorecard row. */
const DIMENSION_HEADING_RE = /^(.+?)\s*[:—–-]\s*(\d+)\s*\/\s*100\s*$/;

function ScorecardHeading({ text }: { text: string }) {
  const match = text.match(DIMENSION_HEADING_RE);
  if (!match) {
    return (
      <h3 className="font-anton uppercase tracking-wide text-2xl mt-10 mb-3">{text}</h3>
    );
  }
  const [, name, scoreStr] = match;
  const score = Number(scoreStr);
  const { token, label } = scoreBand(score);

  return (
    <div className="not-prose mt-12 mb-4 first:mt-0">
      <div className="flex items-end justify-between gap-4 mb-2">
        <h3 className="font-anton uppercase tracking-wide text-foreground text-2xl md:text-3xl leading-none">
          {name}
        </h3>
        <div className="flex items-baseline gap-2">
          <span className={`font-anton text-3xl md:text-5xl leading-none tabular-nums text-scorecard-${token}`}>
            {score}
          </span>
          <span className="font-anton text-lg text-muted-foreground">/100</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-1 flex-1 bg-muted overflow-hidden rounded-full">
          <div className={`h-full rounded-full bg-scorecard-${token}`} style={{ width: `${score}%` }} />
        </div>
        <span className={`font-poppins text-[10px] uppercase tracking-[0.2em] text-scorecard-${token} font-semibold whitespace-nowrap`}>
          {label}
        </span>
      </div>
    </div>
  );
}

function flattenChildrenToText(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(flattenChildrenToText).join('');
  if (children && typeof children === 'object' && 'props' in children) {
    return flattenChildrenToText((children as { props: { children: React.ReactNode } }).props.children);
  }
  return '';
}

export function ReportContent({ markdown, ctaTier, assessmentId, dimensions, compositeScore }: Props) {
  const bookingUrl = ctaTier === 'growth' ? GROWTH_BOOKING_URL : STUDIO_BOOKING_URL;
  const tierLabel = ctaTier === 'growth' ? 'Growth' : 'Studio';

  return (
    <>
      <div className="mb-8 flex justify-end gap-3">
        <a
          href={`/api/biz-dev/pdf/${assessmentId}`}
          className="font-poppins text-xs uppercase tracking-[0.18em] border border-foreground px-4 py-2 hover:bg-foreground hover:text-background transition-colors"
        >
          Download PDF →
        </a>
      </div>

      <ScoreSummary dimensions={dimensions} composite={compositeScore} />

      <article className="prose prose-lg max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          remarkRehypeOptions={{ footnoteLabel: 'Sources', footnoteLabelTagName: 'h2', footnoteBackLabel: 'Back to citation' }}
          components={{
            h3: ({ children }: ComponentPropsWithoutRef<'h3'>) => (
              <ScorecardHeading text={flattenChildrenToText(children)} />
            ),
          }}
        >
          {markdown}
        </ReactMarkdown>
      </article>

      <aside className="not-prose mt-16 border-2 border-foreground bg-foreground text-background p-8 md:p-12 relative overflow-hidden">
        <div className="absolute -top-6 -right-6 font-anton text-[10rem] leading-none text-brand opacity-30 select-none pointer-events-none">
          {tierLabel === 'Growth' ? '02' : '01'}
        </div>
        <p className="font-poppins text-xs uppercase tracking-[0.25em] text-brand mb-3 relative">Your next step</p>
        <h2 className="font-anton uppercase tracking-tight text-3xl md:text-4xl leading-tight mb-4 max-w-xl relative">
          Book a call about SalesOS {tierLabel}
        </h2>
        <p className="font-poppins text-base md:text-lg text-background/80 mb-6 max-w-xl relative">
          15 minutes. I&apos;ll tell you straight whether it&apos;s the right move for your agency.
        </p>
        <a
          href={bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="relative inline-flex items-center gap-2 bg-brand text-brand-foreground font-poppins font-semibold uppercase tracking-wider text-sm px-6 py-3 hover:bg-brand-ink transition-colors"
        >
          Book a call with Tim
          <span aria-hidden>→</span>
        </a>
      </aside>

      <div className="mt-12 pt-8 border-t border-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logos/Tim.svg"
          alt="Tim Kilroy signature"
          className="h-16 mb-3"
        />
        <p className="font-poppins text-sm text-muted-foreground">
          <span className="font-anton uppercase tracking-wide text-foreground text-base">Tim Kilroy</span> · SalesOS
        </p>
      </div>
    </>
  );
}
