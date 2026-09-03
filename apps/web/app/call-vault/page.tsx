import type { Metadata } from 'next';
import CallVaultForm from './CallVaultForm';

export const metadata: Metadata = {
  title: 'Contribute a sales call — Tim Kilroy',
  description:
    'Share 3-5 sales calls, get an individualized improvement plan and a 30-minute review.',
};

export default async function CallVaultPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="min-h-screen bg-black">
      <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-16">
        <header className="space-y-3 text-center">
          <p className="font-anton uppercase tracking-widest text-[#B3B3B3] text-sm">
            The Call Vault
          </p>
          <h1 className="font-anton uppercase tracking-wide text-4xl leading-tight text-white md:text-5xl">
            Hand over a few calls, get a plan back.
          </h1>
          <p className="mx-auto max-w-xl font-poppins text-lg text-[#B3B3B3]">
            Share 3&ndash;5 sales calls &mdash; recordings, transcripts, whatever you have
            &mdash; and get an individualized improvement plan plus a 30-minute review call.
            Sign an NDA right here if you want one, no email, no waiting.
          </p>
        </header>
        <CallVaultForm resumeToken={token ?? null} />
        <p className="text-center font-poppins text-xs text-[#808080]">
          Handled by{' '}
          <a href="https://timkilroy.com" className="text-[#FFDE59] underline">
            Tim Kilroy
          </a>
          . Your calls are used to build your plan and, in anonymized and aggregated form,
          to sharpen advice for everyone &mdash; never shared identifiably without your say-so.
        </p>
      </main>
    </div>
  );
}
