import Link from 'next/link';
import Image from 'next/image';

export default function AgencyToolsPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="px-6 py-8 border-b border-white/10">
        <div className="max-w-6xl mx-auto">
          <Link href="/">
            <Image
              src="/logos/trios-logo-sq-transparent.png"
              alt="TriOS"
              width={120}
              height={120}
              className="hover:opacity-80 transition-opacity"
            />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 py-16 max-w-6xl mx-auto text-center">
        <h1 className="font-anton text-5xl md:text-7xl mb-6 tracking-tight">
          FREE <span className="text-[#E51B23]">AGENCY TOOLS</span>
        </h1>
        <p className="text-xl md:text-2xl text-[#B3B3B3] max-w-3xl mx-auto leading-relaxed">
          These free tools will rock your fucking world. No login. No credit card.
          Just real coaching built from working with 500+ agencies who've learned
          the hard way so you don't have to.
        </p>
      </section>

      {/* Tools Grid */}
      <section className="px-6 pb-16 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-6">

          {/* Call Lab */}
          <Link
            href="/call-lab"
            className="border-2 border-[#333] rounded-lg p-8 text-left hover:border-[#E51B23] transition-all duration-300 hover:scale-[1.02] cursor-pointer block group"
          >
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">📞</div>
            <h3 className="font-anton text-2xl text-[#E51B23] uppercase mb-3 tracking-wide">
              Call Lab
            </h3>
            <p className="text-[#B3B3B3] text-base leading-relaxed">
              Paste your call transcript. Get instant coaching on what worked and what to fix.
              See your WTF Method scores and get your One Move to practice.
            </p>
          </Link>

          {/* Call Lab Instant */}
          <Link
            href="/call-lab-instant"
            className="border-2 border-[#333] rounded-lg p-8 text-left hover:border-[#FFDE59] transition-all duration-300 hover:scale-[1.02] cursor-pointer block group"
          >
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">🎙️</div>
            <h3 className="font-anton text-2xl text-[#FFDE59] uppercase mb-3 tracking-wide">
              Call Lab Instant
            </h3>
            <p className="text-[#B3B3B3] text-base leading-relaxed">
              Record a 90-second pitch. We'll analyze your confidence, clarity, and first impression.
              Perfect for practicing elevator pitches and objection handling.
            </p>
          </Link>

          {/* Discovery Lab */}
          <Link
            href="/discovery-lab"
            className="border-2 border-[#333] rounded-lg p-8 text-left hover:border-[#FFDE59] transition-all duration-300 hover:scale-[1.02] cursor-pointer block group"
          >
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">🔍</div>
            <h3 className="font-anton text-2xl text-[#FFDE59] uppercase mb-3 tracking-wide">
              Discovery Lab
            </h3>
            <p className="text-[#B3B3B3] text-base leading-relaxed">
              Pre-call intelligence briefs with questions, hooks, and authority positioning.
              Research any prospect in 60 seconds and walk in ready to lead.
            </p>
          </Link>

          {/* Visibility Lab */}
          <Link
            href="/visibility-engine"
            className="border-2 border-[#333] rounded-lg p-8 text-left hover:border-[#E51B23] transition-all duration-300 hover:scale-[1.02] cursor-pointer block group"
          >
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">👁️</div>
            <h3 className="font-anton text-2xl text-[#E51B23] uppercase mb-3 tracking-wide">
              Visibility Lab
            </h3>
            <p className="text-[#B3B3B3] text-base leading-relaxed">
              Turn your expertise into demand. Get a custom visibility strategy based on your
              archetype, market position, and what actually works for agencies.
            </p>
          </Link>

          {/* WTF Assessment */}
          <Link
            href="/growthos/assessment"
            className="border-2 border-[#333] rounded-lg p-8 text-left hover:border-[#FFDE59] transition-all duration-300 hover:scale-[1.02] cursor-pointer block group"
          >
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">🎯</div>
            <h3 className="font-anton text-2xl text-[#FFDE59] uppercase mb-3 tracking-wide">
              WTF Assessment
            </h3>
            <p className="text-[#B3B3B3] text-base leading-relaxed">
              Find out where your agency actually stands. Get scored on the 5 revelations that
              separate stalled agencies from ones that scale predictably.
            </p>
          </Link>

        </div>
      </section>

      {/* Footer CTA */}
      <section className="px-6 py-16 border-t border-white/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-anton text-3xl md:text-4xl mb-4 tracking-tight">
            Want the Full <span className="text-[#E51B23]">Agency Growth System?</span>
          </h2>
          <p className="text-[#B3B3B3] text-lg mb-8">
            These tools are just the start. Join the Agency Inner Circle for weekly coaching,
            frameworks, and the playbook 500+ agencies use to grow predictably.
          </p>
          <a
            href="https://www.agencyinnercircle.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-8 py-4 bg-[#E51B23] hover:bg-[#FFDE59] hover:text-black text-white font-anton text-lg uppercase tracking-wide transition-colors"
          >
            Learn More →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-white/10">
        <div className="max-w-6xl mx-auto text-center text-[13px] text-[#666666]">
          <div className="flex justify-center gap-4 mb-4">
            <Link href="/privacy" className="hover:text-[#FFDE59] transition-colors">Privacy</Link>
            <span>·</span>
            <Link href="/terms" className="hover:text-[#FFDE59] transition-colors">Terms</Link>
          </div>
          <p>Copyright © 2018-2025 KLRY, LLC. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
