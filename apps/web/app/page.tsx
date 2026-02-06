import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <main className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-16">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/logos/trios-logo-sq-transparent.png"
            alt="TriOS"
            width={200}
            height={200}
            priority
          />
        </div>

        {/* Hype Text */}
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-poppins text-white leading-relaxed mb-8">
            These tools will help you know exactly{' '}
            <span className="font-anton text-[#E51B23]">WTF</span> to do to grow.
          </h1>
          <p className="text-lg md:text-xl text-[#B3B3B3] leading-relaxed">
            Get more market visibility, do better prospect research and get way better at closing.
            We've got <span className="text-[#FFDE59]">free tools</span> and{' '}
            <span className="text-[#E51B23]">pro tools</span> (and they dig up the real stuff...).
            Try them today.
          </p>
        </div>

        {/* Tool Boxes */}
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 mb-16">
          {/* Free Tools Box */}
          <Link
            href="https://app.timkilroy.com/agency-tools"
            className="border-2 border-[#FFDE59] bg-black hover:bg-[#FFDE59]/5 transition-all duration-300 p-8 group"
          >
            <h2 className="font-anton text-3xl text-[#FFDE59] uppercase tracking-wider mb-4">
              Free Agency Tools
            </h2>
            <p className="text-[#B3B3B3] text-base leading-relaxed mb-6">
              Essential tools to sharpen your sales game. Analyze calls, research prospects,
              assess your sales process, and boost your market visibility—all for free.
            </p>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-3">
                <span className="text-[#FFDE59] text-xl">📞</span>
                <div>
                  <div className="text-white font-semibold">Call Lab</div>
                  <div className="text-[#666666] text-sm">Instant call analysis & coaching</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#FFDE59] text-xl">🔍</span>
                <div>
                  <div className="text-white font-semibold">Discovery Lab</div>
                  <div className="text-[#666666] text-sm">Pre-call intelligence briefs</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#FFDE59] text-xl">👁️</span>
                <div>
                  <div className="text-white font-semibold">Visibility Lab</div>
                  <div className="text-[#666666] text-sm">Track your market presence</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#FFDE59] text-xl">📊</span>
                <div>
                  <div className="text-white font-semibold">WTF Assessment</div>
                  <div className="text-[#666666] text-sm">Sales process evaluation</div>
                </div>
              </li>
            </ul>
            <div className="text-[#FFDE59] font-anton uppercase tracking-wide group-hover:translate-x-2 transition-transform duration-300 inline-block">
              Explore Free Tools →
            </div>
          </Link>

          {/* Pro Tools Box */}
          <div className="border-2 border-[#E51B23] bg-black p-8">
            <h2 className="font-anton text-3xl text-[#E51B23] uppercase tracking-wider mb-4">
              Pro Tools
            </h2>
            <p className="text-[#B3B3B3] text-base leading-relaxed mb-6">
              Advanced AI-powered intelligence for serious revenue growth.
              Deep research, strategic insights, and competitive intelligence.
            </p>

            {/* Pro Tool Cards */}
            <div className="space-y-4">
              <Link
                href="https://timkilroy.com/call-lab-pro"
                target="_blank"
                className="block border border-[#333333] hover:border-[#E51B23] p-4 transition-colors group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-2xl">📞</div>
                  <h3 className="font-anton text-xl text-white uppercase">Call Lab Pro</h3>
                </div>
                <p className="text-[#666666] text-sm">
                  Advanced call analysis with strategic coaching, competitor insights,
                  and deal progression frameworks.
                </p>
                <div className="text-[#E51B23] text-sm font-semibold mt-2 group-hover:translate-x-1 transition-transform duration-300 inline-block">
                  Learn More →
                </div>
              </Link>

              <Link
                href="https://timkilroy.com/discovery-lab-pro"
                target="_blank"
                className="block border border-[#333333] hover:border-[#E51B23] p-4 transition-colors group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-2xl">🔍</div>
                  <h3 className="font-anton text-xl text-white uppercase">Discovery Lab Pro</h3>
                </div>
                <p className="text-[#666666] text-sm">
                  Deep prospect research with competitive landscape analysis,
                  strategic questions, and authority positioning.
                </p>
                <div className="text-[#E51B23] text-sm font-semibold mt-2 group-hover:translate-x-1 transition-transform duration-300 inline-block">
                  Learn More →
                </div>
              </Link>

              <div className="block border border-[#333333] p-4 opacity-60">
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-2xl">👁️</div>
                  <h3 className="font-anton text-xl text-white uppercase">Visibility Lab Pro</h3>
                  <span className="text-[10px] text-[#E51B23] font-semibold uppercase border border-[#E51B23] px-2 py-1">
                    Coming Soon
                  </span>
                </div>
                <p className="text-[#666666] text-sm">
                  Advanced market visibility tracking with competitive monitoring,
                  content gap analysis, and growth opportunities.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Create Account / Login */}
        <div className="max-w-md mx-auto bg-[#1a1a1a] border border-[#333333] p-8">
          <h2 className="font-anton text-2xl text-white uppercase tracking-wider mb-4 text-center">
            Get Started
          </h2>
          <p className="text-[#B3B3B3] text-sm text-center mb-6">
            Create an account to access your tools and track your progress.
          </p>
          <div className="space-y-4">
            <Link
              href="/signup"
              className="block w-full px-6 py-3 bg-[#E51B23] hover:bg-[#c91820] text-white font-anton text-center uppercase tracking-wide transition-colors"
            >
              Create Account
            </Link>
            <Link
              href="/login"
              className="block w-full px-6 py-3 border border-[#333333] hover:border-[#FFDE59] text-white font-anton text-center uppercase tracking-wide transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
