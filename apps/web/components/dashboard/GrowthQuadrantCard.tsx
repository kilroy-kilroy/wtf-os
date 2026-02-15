import Link from 'next/link';
import { GrowthQuadrantResult, ARCHETYPES } from '@/lib/growth-quadrant';

interface Props {
  quadrant: GrowthQuadrantResult;
}

export function GrowthQuadrantCard({ quadrant }: Props) {
  const { executionScore, positioningScore, archetype, completeness, labsCompleted } = quadrant;

  const dotX = executionScore !== null ? Math.max(5, Math.min(95, executionScore)) : 50;
  const dotY = positioningScore !== null ? Math.max(5, Math.min(95, 100 - positioningScore)) : 50;

  const archetypeInfo = archetype ? ARCHETYPES[archetype] : null;

  return (
    <div className="bg-[#1a1a1a] border border-gray-800 p-6 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-anton text-xl text-white uppercase">Growth Quadrant</h3>
        <Link
          href="/growth-quadrant"
          className="text-xs text-gray-500 hover:text-brand-yellow transition-colors uppercase"
        >
          Learn more &rarr;
        </Link>
      </div>

      {archetype && archetypeInfo ? (
        <>
          {/* Quadrant mini-chart */}
          <div className="relative w-full aspect-square max-w-[200px] mx-auto mb-4">
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-px bg-gray-700">
              <div className="bg-yellow-950/20" />
              <div className="bg-red-950/20" />
              <div className="bg-gray-900" />
              <div className="bg-blue-950/20" />
            </div>
            {executionScore !== null && positioningScore !== null && (
              <div
                className="absolute w-4 h-4 bg-brand-red rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2 z-10"
                style={{ left: `${dotX}%`, top: `${dotY}%` }}
              />
            )}
          </div>

          {/* Archetype info */}
          <div className="text-center mb-4">
            <div className="text-2xl mb-1">{archetypeInfo.emoji}</div>
            <div className="font-anton text-brand-yellow text-lg uppercase">{archetype}</div>
            <div className="text-xs text-gray-400 italic mt-1">&quot;{archetypeInfo.oneLiner}&quot;</div>
          </div>

          {/* Scores */}
          <div className="grid grid-cols-2 gap-4 text-center mb-4">
            <div>
              <div className="text-xs text-gray-500 uppercase font-mono">Execution</div>
              <div className="font-anton text-2xl text-white">{executionScore ?? '?'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase font-mono">Positioning</div>
              <div className="font-anton text-2xl text-white">{positioningScore ?? '?'}</div>
            </div>
          </div>

          {/* Improvement hint */}
          {archetype !== 'The Machine' && archetypeInfo.improvementLabs.length > 0 && (
            <div className="border-t border-gray-800 pt-3 text-center">
              <div className="text-xs text-gray-500 mb-2">Level up with:</div>
              <div className="flex flex-wrap justify-center gap-2">
                {archetypeInfo.improvementLabs.map((lab) => {
                  const labHref =
                    lab === 'Call Lab' ? '/call-lab' :
                    lab === 'Discovery Lab' ? '/discovery-lab' :
                    lab === 'Visibility Lab' ? '/visibility-lab' :
                    '/growthos/assessment';
                  return (
                    <Link
                      key={lab}
                      href={labHref}
                      className="text-xs bg-black border border-gray-700 px-2 py-1 text-brand-red hover:border-brand-red transition-colors uppercase font-bold"
                    >
                      {lab}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">&#x1F512;</div>
          <div className="font-anton text-lg text-gray-400 uppercase mb-2">
            {labsCompleted}/4 Labs Complete
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Complete at least one Execution lab and one Positioning lab to unlock your placement.
          </p>
          <div className="space-y-2">
            {!completeness.callLab && (
              <Link href="/call-lab" className="block text-xs text-brand-red hover:text-brand-yellow transition-colors">
                Run Call Lab (Execution) &rarr;
              </Link>
            )}
            {!completeness.discoveryLab && (
              <Link href="/discovery-lab" className="block text-xs text-brand-red hover:text-brand-yellow transition-colors">
                Run Discovery Lab (Execution) &rarr;
              </Link>
            )}
            {!completeness.visibilityLab && (
              <Link href="/visibility-lab" className="block text-xs text-brand-red hover:text-brand-yellow transition-colors">
                Run Visibility Lab (Positioning) &rarr;
              </Link>
            )}
            {!completeness.wtfAssessment && (
              <Link href="/growthos/assessment" className="block text-xs text-brand-red hover:text-brand-yellow transition-colors">
                Take WTF Assessment (Positioning) &rarr;
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
