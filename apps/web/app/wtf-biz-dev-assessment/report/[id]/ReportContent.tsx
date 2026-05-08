'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  markdown: string;
  ctaTier: 'studio' | 'growth';
  assessmentId: string;
}

const STUDIO_BOOKING_URL = process.env.NEXT_PUBLIC_STUDIO_BOOKING_URL ?? 'https://timkilroy.com/book/studio';
const GROWTH_BOOKING_URL = process.env.NEXT_PUBLIC_GROWTH_BOOKING_URL ?? 'https://timkilroy.com/book/growth';

export function ReportContent({ markdown, ctaTier, assessmentId }: Props) {
  const bookingUrl = ctaTier === 'growth' ? GROWTH_BOOKING_URL : STUDIO_BOOKING_URL;
  const tierLabel = ctaTier === 'growth' ? 'Growth' : 'Studio';

  return (
    <article className="prose prose-invert prose-lg max-w-none">
      <div className="mb-6 flex justify-end gap-3 not-prose">
        <a
          href={`/api/biz-dev/pdf/${assessmentId}`}
          className="rounded border border-border px-4 py-2 text-sm hover:bg-accent/10"
        >
          Download PDF
        </a>
      </div>

      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>

      <div className="mt-12 p-6 bg-accent/10 border border-accent/30 rounded-lg not-prose text-center">
        <p className="text-sm uppercase tracking-wider text-accent mb-2">Next step</p>
        <h3 className="text-2xl font-bold mb-3">Book a call about SalesOS {tierLabel}</h3>
        <p className="text-muted-foreground mb-4">
          15 minutes. I&apos;ll tell you straight whether it&apos;s the right move for your agency.
        </p>
        <a
          href={bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-full bg-foreground text-background px-8 py-3 font-semibold hover:opacity-90"
        >
          Book a call with Tim &rarr;
        </a>
      </div>

      <div className="mt-12 not-prose">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/tim-signature.png"
          alt="Tim Kilroy signature"
          className="h-16 mb-2"
        />
        <p className="text-sm text-muted-foreground">— Tim Kilroy, SalesOS</p>
      </div>
    </article>
  );
}
