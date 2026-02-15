import Link from 'next/link';

/**
 * Visibility Lab Examples Landing Page
 *
 * Public showcase page for potential customers to see what they'd get.
 * All data is synthetic - no auth required.
 */
export default function VisibilityLabExamplesPage() {
  const examples = [
    {
      title: 'Visibility Lab Pro Report',
      description: 'Full visibility intelligence with Kilroy Visibility Index, buyer journey mapping, competitor war room, operator profiling and content intelligence engine.',
      href: '/visibility-lab-examples/report-visibility-lab-pro',
      tier: 'Pro',
      icon: '🔬',
    },
    {
      title: 'Visibility Lab Report',
      description: 'Essential visibility audit with VVV pulse check, competitor battlecards, content gaps and a 90-day execution plan.',
      href: '/visibility-lab-examples/report-visibility-lab',
      tier: 'Free',
      icon: '👁️',
    },
  ];

  return (
    <div className="min-h-screen bg-black py-12 px-4 text-white">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="font-anton text-3xl tracking-wide uppercase mb-2">
            <span className="text-white">DEMAND</span>
            <span className="text-[#E51B23]">OS</span>
          </div>
          <h1 className="font-anton text-4xl md:text-5xl text-[#FFDE59] uppercase tracking-wide mb-4">
            See Before You Scan
          </h1>
          <p className="text-[#B3B3B3] text-lg max-w-xl mx-auto">
            Preview the Visibility Lab with sample data. See the strategic intelligence
            you&apos;ll get about your brand&apos;s market presence.
          </p>
        </div>

        {/* Example Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {examples.map((example) => (
            <Link
              key={example.href}
              href={example.href}
              className="group border border-[#333] rounded-lg p-6 hover:border-[#E51B23] transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <span className="text-4xl">{example.icon}</span>
                <span
                  className="font-anton text-xs uppercase px-2 py-1 rounded"
                  style={{
                    backgroundColor: example.tier === 'Pro' ? '#FFDE59' : 'transparent',
                    color: example.tier === 'Pro' ? '#000' : '#666',
                    border: example.tier === 'Pro' ? 'none' : '1px solid #333',
                  }}
                >
                  {example.tier}
                </span>
              </div>

              <h2 className="font-anton text-xl text-white uppercase tracking-wide mb-2 group-hover:text-[#E51B23] transition-colors">
                {example.title}
              </h2>

              <p className="text-sm text-[#B3B3B3] leading-relaxed mb-4">
                {example.description}
              </p>

              <div className="flex items-center text-[#E51B23] font-anton text-sm uppercase">
                View Example →
              </div>
            </Link>
          ))}
        </div>

        {/* CTA Section */}
        <div className="border border-[#E51B23] rounded-lg p-8 text-center">
          <h2 className="font-anton text-2xl text-[#FFDE59] uppercase tracking-wide mb-4">
            Ready to audit your visibility?
          </h2>
          <p className="text-[#B3B3B3] mb-6 max-w-md mx-auto">
            Start with a free Visibility Lab report or upgrade to Pro for the full Kilroy Visibility Index and competitor war room.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/visibility-lab?utm_source=example"
              className="bg-[#E51B23] text-white px-6 py-3 font-anton text-sm uppercase tracking-wider hover:bg-[#C41820] transition-colors"
            >
              Try Visibility Lab Free
            </Link>
            <Link
              href="/visibility-lab-pro?utm_source=example"
              className="border border-[#FFDE59] text-[#FFDE59] px-6 py-3 font-anton text-sm uppercase tracking-wider hover:bg-[#FFDE59] hover:text-black transition-colors"
            >
              See Visibility Lab Pro
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-[#666] text-sm">
          <p>All example data is synthetic. Your actual reports will reflect real market intelligence from live web research.</p>
        </div>
      </div>
    </div>
  );
}
