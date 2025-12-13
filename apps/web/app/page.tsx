export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center space-y-8 p-8">
        {/* Logo */}
        <div>
          <h1 className="font-anton text-6xl md:text-7xl tracking-wide uppercase">
            <span className="text-white">SALES</span>
            <span className="text-[#E51B23]">OS</span>
          </h1>
          <p className="font-anton text-sm text-[#FFDE59] uppercase tracking-wider mt-2">
            BY TIM KILROY
          </p>
        </div>

        {/* Tagline */}
        <p className="text-xl text-[#B3B3B3] max-w-md mx-auto">
          Stop guessing. Start closing.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <a
            href="/call-lab-instant"
            className="px-8 py-4 bg-[#E51B23] hover:bg-[#FFDE59] hover:text-black text-white font-anton text-lg uppercase tracking-wide transition-colors"
          >
            Try It Free →
          </a>
          <a
            href="/login"
            className="px-8 py-4 border border-[#333] hover:border-[#E51B23] text-white font-anton text-lg uppercase tracking-wide transition-colors"
          >
            Sign In
          </a>
        </div>

        {/* Labs Preview */}
        <div className="mt-16 grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <div className="border border-[#333] rounded-lg p-6 text-left hover:border-[#E51B23] transition-colors">
            <div className="text-3xl mb-3">📞</div>
            <h3 className="font-anton text-lg text-[#E51B23] uppercase mb-2">Call Lab</h3>
            <p className="text-[#B3B3B3] text-sm">
              Paste your call transcript. Get instant coaching on what worked and what to fix.
            </p>
          </div>
          <div className="border border-[#333] rounded-lg p-6 text-left hover:border-[#FFDE59] transition-colors">
            <div className="text-3xl mb-3">🔍</div>
            <h3 className="font-anton text-lg text-[#FFDE59] uppercase mb-2">Discovery Lab</h3>
            <p className="text-[#B3B3B3] text-sm">
              Pre-call intelligence briefs with questions, hooks, and authority positioning.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
