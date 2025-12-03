'use client';

import { useState, useEffect } from 'react';

// Type definition for personalized copy
interface PersonalizedCopy {
  pain_paragraph: string;
  what_you_dont_know: string;
  testimonial_quote: string;
  testimonial_attribution: string;
  cta_urgency: string;
  score: string;
  effectiveness: string;
}

export default function CallLabProPage() {
  const [personalizedCopy, setPersonalizedCopy] = useState<PersonalizedCopy | null>(null);

  useEffect(() => {
    // TODO: In production, fetch this from the user's last Lite report
    // For now, use example data
    const exampleCopy: PersonalizedCopy = {
      pain_paragraph: "You know the call was a 7/10. You know you gave away the entire strategy session. You know you ended with 'let me know what you think'.",
      what_you_dont_know: "Where you missed the BUY signal (8 detected, how many did you act on?), where you didn't handle the \"UH...I DON'T KNOW IF THIS IS FOR ME\" pause (3 times), or the exact moment trust peaked.",
      testimonial_quote: "I've been giving away strategy for 18 months. Pro showed me I wasn't building trust—I was eliminating urgency.",
      testimonial_attribution: "$2mm performance marketing agency founder",
      cta_urgency: "You're already doing the calls.",
      score: "7/10",
      effectiveness: "Strong discovery, weak close"
    };
    setPersonalizedCopy(exampleCopy);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white font-poppins overflow-x-hidden">
      {/* Background Effects */}
      <div className="fixed top-0 left-0 right-0 bottom-0 pointer-events-none z-0">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(229, 27, 35, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(229, 27, 35, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="animate-fadeIn px-5 pt-5 pb-8 max-w-[1200px] mx-auto">
          <div className="text-[9px] tracking-[2px] text-[#666666] mb-1.5">
            SYSTEM STATUS: <span className="text-[#E51B23]">●</span> UPGRADE AVAILABLE
          </div>

          <h1 className="font-anton text-[clamp(36px,7vw,72px)] tracking-[3px] my-0 mb-3 leading-none uppercase whitespace-nowrap">
            CALL LAB <span className="text-[#E51B23]">PRO</span>
          </h1>

          <div className="text-[clamp(14px,1.8vw,20px)] text-[#FFDE59] tracking-[2px]">
            STOP GUESSING. START CLOSING.
          </div>
        </header>

        {/* Problem Hook */}
        <section className="bg-gradient-to-b from-[rgba(229,27,35,0.1)] to-transparent py-16 px-5 border-t-2 border-b-2 border-[#E51B23]">
          <div className="max-w-[900px] mx-auto">
            <h2 className="text-[clamp(24px,3vw,42px)] leading-[1.3] font-semibold mb-6">
              Call Lab Lite gave you the diagnosis.
              <br />
              <span className="text-[#E51B23]">Call Lab Pro gives you the cure.</span>
            </h2>

            <div className="text-lg leading-[1.6] text-[#CCCCCC] max-w-[700px]">
              {personalizedCopy && (
                <>
                  <p className="mb-4">{personalizedCopy.pain_paragraph}</p>
                  <p className="mb-4">
                    <span className="text-white font-semibold">What you don&apos;t know:</span> {personalizedCopy.what_you_dont_know}
                  </p>
                  <p>
                    <span className="text-white font-semibold">What you are going to learn:</span> The exact patterns that sabotage you every fucking call. The exact moments to accelerate. The exact minute to peel off because it&apos;s a bad fit. The exact version of you and your offer that needs to show up to stack win after win.
                  </p>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 px-5 max-w-[1200px] mx-auto">
          <h2 className="font-anton text-[clamp(32px,4vw,48px)] text-[#E51B23] mb-4 tracking-[2px]">
            WHAT YOU GET
          </h2>

          <p className="text-base text-[#666666] mb-16 max-w-[600px]">
            Everything in Lite, plus the pattern recognition system that turns good salespeople into closers.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: '⚡',
                title: 'The Exact Moment They Decided',
                description: 'Timestamp-level breakdown of every buying signal, objection, and decision point. See the three seconds where they went from \'maybe\' to \'yes\'—and what you said that triggered it.'
              },
              {
                icon: '🎯',
                title: 'Pattern Library',
                description: 'Every named pattern in Tim\'s methodology. The Mirror Close. The Generosity Trap. The Diagnostic Reveal. The Vulnerability Flip. Learn when you\'re using them and when you\'re fucking them up.'
              },
              {
                icon: '📈',
                title: 'Trust Curve Visualization',
                description: 'Watch trust build and break across the call timeline. See exactly where you gained credibility and where you killed momentum. This is what separates closers from consultants.'
              },
              {
                icon: '🔍',
                title: 'Multi-Call Performance Tracking',
                description: 'Spot your patterns across 10, 20, 50 calls. Are you consistently giving away strategy? Always soft on close? Your blind spots become undeniable.'
              },
              {
                icon: '⚔️',
                title: 'Competitor Framework Comparison',
                description: 'See how your call stacks up against 8 other sales methodologies: Sandler, SPIN, Challenger, MEDDIC, Gap Selling, and more. What they\'d say you missed—and why Tim\'s approach is different.'
              },
              {
                icon: '💬',
                title: 'Tactical Language Examples',
                description: 'Not just \'you should have closed harder.\' Get the exact phrases, transitions, and questions that would have changed the outcome. Copy-paste-worthy coaching.'
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-[#1A1A1A] border border-[#333333] p-8 relative transition-all duration-300 hover:border-[#E51B23] hover:-translate-y-1 cursor-pointer group"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-[#E51B23] scale-y-0 origin-top transition-transform duration-300 group-hover:scale-y-100" />
                <div className="text-5xl mb-4 animate-float" style={{ animationDelay: `${index * 0.2}s` }}>
                  {feature.icon}
                </div>
                <h3 className="font-anton text-xl text-[#FFDE59] mb-3 tracking-wide">
                  {feature.title}
                </h3>
                <p className="text-sm leading-[1.6] text-[#CCCCCC]">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Social Proof */}
        <section className="bg-[#FFDE59] text-black py-16 px-5">
          <div className="max-w-[900px] mx-auto">
            {personalizedCopy && (
              <>
                <blockquote className="text-[clamp(24px,3vw,36px)] font-bold leading-[1.3] mb-6">
                  &quot;{personalizedCopy.testimonial_quote}&quot;
                </blockquote>
                <p className="text-base opacity-80">
                  — {personalizedCopy.testimonial_attribution}
                </p>
              </>
            )}
          </div>
        </section>

        {/* Pricing */}
        <section className="py-20 px-5 max-w-[1000px] mx-auto">
          <h2 className="font-anton text-[clamp(32px,4vw,48px)] text-[#E51B23] mb-4 tracking-[2px] text-center">
            CHOOSE YOUR DEPLOYMENT
          </h2>

          <p className="text-base text-[#666666] text-center max-w-[600px] mx-auto mb-16">
            Start solo, scale your team. Same killer analysis, more seats.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-[800px] mx-auto">
            {/* Single Seat */}
            <div className="bg-[#1A1A1A] border-2 border-[#E51B23] p-12 text-center relative transition-all duration-300 hover:scale-105 cursor-pointer">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#E51B23] text-white px-4 py-1 text-[11px] tracking-[2px] font-bold">
                SOLO OPERATOR
              </div>

              <div className="text-sm text-[#FFDE59] mb-4 tracking-wide font-semibold">
                Single Seat
              </div>
              <div className="font-anton text-[64px] text-white mb-2 leading-none">
                $29
              </div>
              <div className="text-sm text-[#666666] mb-6">
                /month
              </div>
              <div className="text-base text-white mb-4 font-semibold">
                1 User License
              </div>
              <p className="text-[13px] text-[#CCCCCC] mb-8 min-h-[60px] leading-[1.5]">
                Perfect for founders, solo consultants, and individual contributors who want to level up their close rate.
              </p>

              <a
                href="/call-lab-pro/checkout?plan=solo"
                className="block bg-[#E51B23] text-white border-none py-4 px-9 font-anton text-base font-bold tracking-[2px] cursor-pointer w-full transition-all duration-300 hover:bg-[#FFDE59] hover:text-black text-center no-underline"
              >
                [ ACTIVATE PRO ]
              </a>
            </div>

            {/* Team License */}
            <div className="bg-[#1A1A1A] border border-[#333333] p-12 text-center relative transition-all duration-300 hover:scale-105 hover:border-[#E51B23] cursor-pointer">
              <div className="text-sm text-[#FFDE59] mb-4 tracking-wide font-semibold">
                Team License
              </div>
              <div className="font-anton text-[64px] text-white mb-2 leading-none">
                $89
              </div>
              <div className="text-sm text-[#666666] mb-6">
                /month
              </div>
              <div className="text-base text-white mb-4 font-semibold">
                5 User Licenses
              </div>
              <p className="text-[13px] text-[#CCCCCC] mb-8 min-h-[60px] leading-[1.5]">
                For agencies and teams. Share pattern insights, compare performance, build a culture of continuous improvement.
              </p>

              <a
                href="/call-lab-pro/checkout?plan=team"
                className="block bg-[#333333] text-white border-none py-4 px-9 font-anton text-base font-bold tracking-[2px] cursor-pointer w-full transition-all duration-300 hover:bg-[#FFDE59] hover:text-black text-center no-underline"
              >
                [ ACTIVATE PRO ]
              </a>
            </div>
          </div>

          <p className="text-center mt-10 text-[13px] text-[#666666]">
            Cancel anytime. No long-term contracts. No bullshit.
          </p>

        </section>

        {/* Final CTA */}
        <section className="bg-gradient-to-b from-[rgba(229,27,35,0.2)] to-black py-20 px-5 text-center border-t-2 border-[#E51B23]">
          <div className="max-w-[800px] mx-auto">
            <h2 className="font-anton text-[clamp(32px,4vw,56px)] mb-6 leading-[1.1] tracking-[2px]">
              {personalizedCopy?.cta_urgency.toUpperCase()}
              <br />
              <span className="text-[#FFDE59]">NOW LEARN FROM THEM.</span>
            </h2>

            <p className="text-lg text-[#CCCCCC] mb-12 leading-[1.6]">
              Pro turns every sales call into a pattern recognition session. The more you analyze, the more your blind spots become undeniable—and fixable.
            </p>

            <a
              href="#pricing"
              className="inline-block bg-[#E51B23] text-white border-2 border-[#E51B23] py-6 px-16 font-anton text-xl font-bold tracking-[3px] cursor-pointer transition-all duration-300 hover:bg-[#FFDE59] hover:border-[#FFDE59] hover:text-black hover:scale-105 no-underline animate-pulse"
            >
              [ UPGRADE TO PRO ]
            </a>

            <div className="mt-8 text-[13px] text-[#666666]">
              Questions? Email <span className="text-[#FFDE59]">tim@timkilroy.com</span>
            </div>
          </div>
        </section>
      </div>

      {/* Custom Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .animate-fadeIn {
          animation: fadeIn 1.2s ease-out;
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
