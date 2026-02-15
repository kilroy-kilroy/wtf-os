import { Metadata } from 'next';
import Link from 'next/link';
import { ARCHETYPES, GrowthArchetype } from '@/lib/growth-quadrant';

export const metadata: Metadata = {
  title: 'Growth Quadrant | TriOS',
  description: 'Discover your agency growth archetype based on real lab data. Are you a Sleeper, Hidden Gem, Megaphone, or Machine?',
};

const QUADRANT_DATA: Array<{
  archetype: GrowthArchetype;
  execution: string;
  positioning: string;
  color: string;
  bgColor: string;
  borderColor: string;
  labLinks: Array<{ name: string; href: string }>;
}> = [
  {
    archetype: 'The Sleeper',
    execution: 'Low',
    positioning: 'Low',
    color: 'text-gray-400',
    bgColor: 'bg-gray-900',
    borderColor: 'border-gray-600',
    labLinks: [
      { name: 'Call Lab', href: '/call-lab' },
      { name: 'Visibility Lab', href: '/visibility-lab' },
    ],
  },
  {
    archetype: 'The Hidden Gem',
    execution: 'High',
    positioning: 'Low',
    color: 'text-blue-400',
    bgColor: 'bg-blue-950/30',
    borderColor: 'border-blue-600',
    labLinks: [
      { name: 'Visibility Lab', href: '/visibility-lab' },
      { name: 'WTF Assessment', href: '/growthos/assessment' },
    ],
  },
  {
    archetype: 'The Megaphone',
    execution: 'Low',
    positioning: 'High',
    color: 'text-brand-yellow',
    bgColor: 'bg-yellow-950/30',
    borderColor: 'border-brand-yellow',
    labLinks: [
      { name: 'Call Lab', href: '/call-lab' },
      { name: 'Discovery Lab', href: '/discovery-lab' },
    ],
  },
  {
    archetype: 'The Machine',
    execution: 'High',
    positioning: 'High',
    color: 'text-brand-red',
    bgColor: 'bg-red-950/30',
    borderColor: 'border-brand-red',
    labLinks: [],
  },
];

export default function GrowthQuadrantPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="text-brand-red text-xs font-mono uppercase tracking-widest mb-4">
            TriOS Growth Framework
          </div>
          <h1 className="text-5xl md:text-6xl font-anton uppercase mb-6">
            The Growth <span className="text-brand-red">Quadrant</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto font-poppins">
            Your position isn&apos;t a label. It&apos;s a starting point.
            The more labs you run, the more accurate your placement — and the clearer your next move.
          </p>
        </div>

        {/* Visual Quadrant Chart */}
        <div className="max-w-lg mx-auto mb-20">
          <div className="relative mx-12">
            <div className="text-center mb-2 text-xs text-gray-500 uppercase tracking-widest font-mono">
              High Positioning
            </div>
            <div className="grid grid-cols-2 gap-1 border border-gray-700">
              <div className="bg-yellow-950/20 border border-brand-yellow/20 p-6 text-center min-h-[140px] flex flex-col items-center justify-center">
                <div className="text-3xl mb-2">{ARCHETYPES['The Megaphone'].emoji}</div>
                <div className="font-anton text-brand-yellow uppercase text-sm">The Megaphone</div>
              </div>
              <div className="bg-red-950/20 border border-brand-red/20 p-6 text-center min-h-[140px] flex flex-col items-center justify-center">
                <div className="text-3xl mb-2">{ARCHETYPES['The Machine'].emoji}</div>
                <div className="font-anton text-brand-red uppercase text-sm">The Machine</div>
              </div>
              <div className="bg-gray-900 border border-gray-700 p-6 text-center min-h-[140px] flex flex-col items-center justify-center">
                <div className="text-3xl mb-2">{ARCHETYPES['The Sleeper'].emoji}</div>
                <div className="font-anton text-gray-400 uppercase text-sm">The Sleeper</div>
              </div>
              <div className="bg-blue-950/20 border border-blue-600/20 p-6 text-center min-h-[140px] flex flex-col items-center justify-center">
                <div className="text-3xl mb-2">{ARCHETYPES['The Hidden Gem'].emoji}</div>
                <div className="font-anton text-blue-400 uppercase text-sm">The Hidden Gem</div>
              </div>
            </div>
            <div className="text-center mt-2 text-xs text-gray-500 uppercase tracking-widest font-mono">
              Low Positioning
            </div>
            <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 -rotate-90 text-xs text-gray-500 uppercase tracking-widest font-mono whitespace-nowrap pr-4">
              Low Execution
            </div>
            <div className="absolute right-0 top-1/2 translate-x-full -translate-y-1/2 rotate-90 text-xs text-gray-500 uppercase tracking-widest font-mono whitespace-nowrap pl-4">
              High Execution
            </div>
          </div>
        </div>

        {/* Axis Explainers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          <div className="bg-[#1a1a1a] border border-gray-800 p-8">
            <h3 className="font-anton text-2xl text-brand-yellow uppercase mb-4">
              Execution Axis
            </h3>
            <p className="text-gray-400 mb-4 font-poppins">
              Can you close? Are your sales calls effective? Do you prepare thoroughly for discovery?
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <span className="text-brand-red font-bold w-12">60%</span>
                <Link href="/call-lab" className="text-white hover:text-brand-yellow transition-colors">
                  Call Lab &rarr;
                </Link>
                <span className="text-gray-500">Overall call score, trust velocity, agenda control</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-brand-red font-bold w-12">40%</span>
                <Link href="/discovery-lab" className="text-white hover:text-brand-yellow transition-colors">
                  Discovery Lab &rarr;
                </Link>
                <span className="text-gray-500">Brief completeness, version, volume</span>
              </div>
            </div>
          </div>

          <div className="bg-[#1a1a1a] border border-gray-800 p-8">
            <h3 className="font-anton text-2xl text-brand-yellow uppercase mb-4">
              Positioning Axis
            </h3>
            <p className="text-gray-400 mb-4 font-poppins">
              Can they find you? When they do, is your brand clear, credible, and differentiated?
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <span className="text-brand-red font-bold w-12">60%</span>
                <Link href="/visibility-lab" className="text-white hover:text-brand-yellow transition-colors">
                  Visibility Lab &rarr;
                </Link>
                <span className="text-gray-500">Visibility score, VVV clarity</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-brand-red font-bold w-12">40%</span>
                <Link href="/growthos/assessment" className="text-white hover:text-brand-yellow transition-colors">
                  WTF Assessment &rarr;
                </Link>
                <span className="text-gray-500">Overall score, category scores</span>
              </div>
            </div>
          </div>
        </div>

        {/* Archetype Detail Cards */}
        <h2 className="text-4xl font-anton uppercase text-center mb-12">
          The Four <span className="text-brand-red">Archetypes</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          {QUADRANT_DATA.map((q) => {
            const info = ARCHETYPES[q.archetype];
            return (
              <div
                key={q.archetype}
                className={`${q.bgColor} border ${q.borderColor} p-8`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-4xl">{info.emoji}</span>
                  <div>
                    <h3 className={`font-anton text-2xl uppercase ${q.color}`}>
                      {q.archetype}
                    </h3>
                    <div className="text-xs text-gray-500 font-mono">
                      Execution: {q.execution} / Positioning: {q.positioning}
                    </div>
                  </div>
                </div>
                <p className="text-white text-lg italic mb-4 font-poppins">
                  &quot;{info.oneLiner}&quot;
                </p>
                <div className="border-t border-gray-700 pt-4">
                  <div className="text-xs text-gray-500 uppercase font-bold mb-2">
                    How to level up
                  </div>
                  <p className="text-gray-400 text-sm mb-3">{info.improvementPath}</p>
                  {q.labLinks.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {q.labLinks.map((lab) => (
                        <Link
                          key={lab.href}
                          href={lab.href}
                          className="text-xs bg-black border border-gray-700 px-3 py-1 text-white hover:border-brand-red hover:text-brand-red transition-colors uppercase font-bold"
                        >
                          {lab.name} &rarr;
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center border-t border-gray-800 pt-12">
          <h2 className="text-3xl font-anton uppercase mb-4">
            Ready to find your <span className="text-brand-yellow">position</span>?
          </h2>
          <p className="text-gray-400 mb-8 font-poppins">
            Run any lab to start building your Growth Quadrant profile.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/call-lab"
              className="bg-brand-red text-white px-6 py-3 font-anton uppercase hover:bg-white hover:text-brand-red transition-colors"
            >
              Call Lab
            </Link>
            <Link
              href="/discovery-lab"
              className="bg-brand-red text-white px-6 py-3 font-anton uppercase hover:bg-white hover:text-brand-red transition-colors"
            >
              Discovery Lab
            </Link>
            <Link
              href="/visibility-lab"
              className="bg-brand-red text-white px-6 py-3 font-anton uppercase hover:bg-white hover:text-brand-red transition-colors"
            >
              Visibility Lab
            </Link>
            <Link
              href="/growthos/assessment"
              className="bg-brand-red text-white px-6 py-3 font-anton uppercase hover:bg-white hover:text-brand-red transition-colors"
            >
              WTF Assessment
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
