'use client';

import { useState, useEffect } from 'react';

interface PersonalizedCopy {
  pain_paragraph: string;
  what_you_dont_know: string;
  testimonial_quote: string;
  testimonial_attribution: string;
  cta_urgency: string;
}

export default function DiscoveryLabProPage() {
  const [personalizedCopy, setPersonalizedCopy] = useState<PersonalizedCopy | null>(null);

  useEffect(() => {
    const exampleCopy: PersonalizedCopy = {
      pain_paragraph:
        "You walk into calls hoping your questions land. You leave calls wondering if you asked the right things. You Google the company 10 minutes before and pray that's enough.",
      what_you_dont_know:
        "What keeps this specific person up at night. What they'll Google after your call. What authority frame would make them lean in instead of cross their arms.",
      testimonial_quote:
        "I used to wing discovery. Now I walk in knowing more about their problems than they do. It's not fair, honestly.",
      testimonial_attribution: 'Agency founder, $1.5mm ARR',
      cta_urgency: "You're already booking the calls.",
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
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="animate-fadeIn px-5 pt-5 pb-8 max-w-[1200px] mx-auto">
          <div className="text-[9px] tracking-[2px] text-[#666666] mb-1.5">
            SYSTEM STATUS: <span className="text-[#E51B23]">●</span> UPGRADE
            AVAILABLE
          </div>

          <h1 className="font-anton text-[clamp(36px,7vw,72px)] tracking-[3px] my-0 mb-3 leading-none uppercase whitespace-nowrap">
            DISCOVERY LAB <span className="text-[#E51B23]">PRO</span>
          </h1>

          <div className="text-[clamp(14px,1.8vw,20px)] text-[#FFDE59] tracking-[2px]">
            WIN BEFORE THE CALL STARTS.
          </div>
        </header>

        {/* Problem Hook */}
        <section className="bg-gradient-to-b from-[rgba(229,27,35,0.1)] to-transparent py-16 px-5 border-t-2 border-b-2 border-[#E51B23]">
          <div className="max-w-[900px] mx-auto">
            <h2 className="text-[clamp(24px,3vw,42px)] leading-[1.3] font-semibold mb-6">
              Discovery Lab gave you questions.
              <br />
              <span className="text-[#E51B23]">
                Discovery Lab Pro gives you the playbook.
              </span>
            </h2>

            <div className="text-lg leading-[1.6] text-[#CCCCCC] max-w-[700px]">
              {personalizedCopy && (
                <>
                  <p className="mb-4">{personalizedCopy.pain_paragraph}</p>
                  <p className="mb-4">
                    <span className="text-white font-semibold">
                      What you don&apos;t know:
                    </span>{' '}
                    {personalizedCopy.what_you_dont_know}
                  </p>
                  <p>
                    <span className="text-white font-semibold">
                      What you&apos;re about to get:
                    </span>{' '}
                    A complete pre-call intelligence brief. Company research.
                    Prospect psychology. Opening scripts. Question arsenals. The
                    exact conversation tree for every direction the call could
                    go.
                  </p>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 px-5 max-w-[1200px] mx-auto">
          <h2 className="font-anton text-[clamp(32px,4vw,48px)] text-[#E51B23] mb-4 tracking-[2px]">
            THE DISCOVERY BLUEPRINT
          </h2>

          <p className="text-base text-[#666666] mb-16 max-w-[600px]">
            Everything in Lite, plus the research and strategy layer that turns
            cold calls into warm conversations.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: '🔍',
                title: 'Company Intel Brief',
                description:
                  "Website analysis, positioning breakdown, recent news. Know what they do, how they talk about it, and what's changed recently--before you pick up the phone.",
              },
              {
                icon: '🧠',
                title: 'Prospect Psychology',
                description:
                  "LinkedIn analysis, role context, tenure signals, potential hot buttons. Understand what they're measured on and what keeps them up at night.",
              },
              {
                icon: '🎬',
                title: 'Opening 60 Seconds',
                description:
                  'Scripted authority frame plus the exact reason why you wanted to talk to THEM specifically. No more generic openers that get you ignored.',
              },
              {
                icon: '⚔️',
                title: 'Question Arsenal',
                description:
                  'Authority questions that establish credibility. Depth questions that create insight. Guidance questions that steer toward your strengths. 15 total, organized by purpose.',
              },
              {
                icon: '🚪',
                title: 'Permission Gate Qualifiers',
                description:
                  'The 5 specific data points you need to advance this deal. Know exactly what qualifies a prospect before you waste time on the wrong ones.',
              },
              {
                icon: '🔮',
                title: 'What They\'ll Google',
                description:
                  "The 2-3 things prospects search after your call to validate you. Plant seeds during the conversation so they find exactly what you want them to find.",
              },
              {
                icon: '📋',
                title: 'Meeting Agenda',
                description:
                  'Recommended structure for the call with time allocations, objectives, and transition language. Run the call like you\'ve done it a hundred times.',
              },
              {
                icon: '🌳',
                title: 'Conversation Decision Tree',
                description:
                  'If/then paths for common objections and directions. Never get caught flat-footed. Have the answer before they ask the question.',
              },
              {
                icon: '🎯',
                title: 'Market Intel',
                description:
                  'Industry trends, pressures, and shifts relevant to this specific deal. Show up knowing what\'s happening in their world.',
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-[#1A1A1A] border border-[#333333] p-8 relative transition-all duration-300 hover:border-[#E51B23] hover:-translate-y-1 cursor-pointer group"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-[#E51B23] scale-y-0 origin-top transition-transform duration-300 group-hover:scale-y-100" />
                <div
                  className="text-5xl mb-4 animate-float"
                  style={{ animationDelay: `${index * 0.2}s` }}
                >
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
        <section id="pricing" className="py-20 px-5 max-w-[1000px] mx-auto">
          <h2 className="font-anton text-[clamp(32px,4vw,48px)] text-[#E51B23] mb-4 tracking-[2px] text-center">
            CHOOSE YOUR DEPLOYMENT
          </h2>

          <p className="text-base text-[#666666] text-center max-w-[600px] mx-auto mb-16">
            Start solo, scale your team. Same killer intel, more seats.
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
              <div className="text-sm text-[#666666] mb-6">/month</div>
              <div className="text-base text-white mb-4 font-semibold">
                1 User License
              </div>
              <p className="text-[13px] text-[#CCCCCC] mb-8 min-h-[60px] leading-[1.5]">
                Perfect for founders and solo sellers who want to show up
                prepared for every call.
              </p>

              <a
                href="/discovery-lab-pro/checkout?plan=solo"
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
              <div className="text-sm text-[#666666] mb-6">/month</div>
              <div className="text-base text-white mb-4 font-semibold">
                5 User Licenses
              </div>
              <p className="text-[13px] text-[#CCCCCC] mb-8 min-h-[60px] leading-[1.5]">
                For sales teams. Share intel templates, build a culture of
                preparation.
              </p>

              <a
                href="/discovery-lab-pro/checkout?plan=team"
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
              <span className="text-[#FFDE59]">NOW WIN THEM BEFORE THEY START.</span>
            </h2>

            <p className="text-lg text-[#CCCCCC] mb-12 leading-[1.6]">
              Pro turns every discovery call into a strategic advantage. The
              more you prepare, the more you close.
            </p>

            <a
              href="#pricing"
              className="inline-block bg-[#E51B23] text-white border-2 border-[#E51B23] py-6 px-16 font-anton text-xl font-bold tracking-[3px] cursor-pointer transition-all duration-300 hover:bg-[#FFDE59] hover:border-[#FFDE59] hover:text-black hover:scale-105 no-underline animate-pulse"
            >
              [ UPGRADE TO PRO ]
            </a>

            <div className="mt-8 text-[13px] text-[#666666]">
              Questions? Email{' '}
              <span className="text-[#FFDE59]">tim@timkilroy.com</span>
            </div>
          </div>
        </section>
      </div>

      {/* Custom Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
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
