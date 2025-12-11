import Link from 'next/link';

export const metadata = {
  title: 'Find Out Why Your Sales Call Failed - In 30 Seconds | Call Lab',
  description:
    'Record a 30-second pitch. Get instant AI analysis of what you are missing. No transcript needed. No signup required.',
};

export default function CallLabInstantPage() {
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Anton&family=Poppins:wght@400;600;700&display=swap"
        rel="stylesheet"
      />
      <div className="min-h-screen bg-black text-white font-[Poppins] flex flex-col justify-center items-center p-8 relative overflow-hidden">
        {/* Background glow */}
      <div
        className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#E51B23] rounded-full opacity-10 blur-[120px] z-0"
        aria-hidden="true"
      />

      <div className="max-w-[800px] text-center z-10">
        <div className="font-bold text-sm text-[#FFDE59] uppercase tracking-[2px] mb-6">
          Call Lab Instant Analysis
        </div>

        <h1 className="font-[Anton] text-5xl md:text-7xl lg:text-8xl leading-[1.1] uppercase mb-6">
          Find Out Why Your
          <br />
          <span className="text-[#E51B23]">Sales Call Failed</span>
        </h1>

        <p className="text-xl md:text-2xl mb-4 leading-relaxed">
          Record a 30-second pitch. Get instant AI analysis of what you&apos;re missing.
        </p>

        <p className="text-lg md:text-xl text-[#FFDE59] font-semibold mb-12">
          No transcript needed. No signup required. Just hit record and learn.
        </p>

        <Link
          href="/quick-analyze"
          className="inline-block font-bold text-xl px-12 py-6 bg-[#E51B23] text-white uppercase tracking-wide no-underline transition-all duration-300 shadow-[0_8px_32px_rgba(229,27,35,0.4)] relative overflow-hidden hover:translate-y-[-2px] hover:shadow-[0_12px_40px_rgba(229,27,35,0.5)] hover:bg-white hover:text-[#E51B23]"
        >
          Try It Now (30 Seconds)
        </Link>

        <p className="mt-6 text-sm text-white/60">
          Completely free. Works in your browser. Takes 30 seconds.
        </p>

        <div className="mt-16 p-8 bg-[#FFDE59]/5 border-l-4 border-[#FFDE59] text-left">
          <p className="text-base leading-relaxed italic">
            &ldquo;Most salespeople think they know why deals don&apos;t close. They&apos;re usually
            wrong. Call Lab shows you what prospects ACTUALLY heard - not what you think you
            said.&rdquo;
          </p>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div className="p-6 bg-white/5 border-t-[3px] border-[#E51B23]">
            <div className="font-[Anton] text-5xl text-[#FFDE59] leading-none mb-2">01</div>
            <div className="font-bold text-lg mb-2">Hit Record</div>
            <p className="text-sm text-white/70 leading-relaxed">
              Deliver your 30-second pitch like you&apos;re on a real sales call.
            </p>
          </div>

          <div className="p-6 bg-white/5 border-t-[3px] border-[#E51B23]">
            <div className="font-[Anton] text-5xl text-[#FFDE59] leading-none mb-2">02</div>
            <div className="font-bold text-lg mb-2">AI Analyzes</div>
            <p className="text-sm text-white/70 leading-relaxed">
              Our system transcribes and analyzes your pitch in real-time.
            </p>
          </div>

          <div className="p-6 bg-white/5 border-t-[3px] border-[#E51B23]">
            <div className="font-[Anton] text-5xl text-[#FFDE59] leading-none mb-2">03</div>
            <div className="font-bold text-lg mb-2">See What&apos;s Missing</div>
            <p className="text-sm text-white/70 leading-relaxed">
              Get instant feedback on clarity, confidence, objection handling, and more.
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
