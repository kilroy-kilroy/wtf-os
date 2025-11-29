'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ConsolePanel,
  ConsoleHeading,
  ConsoleButton,
  SalesOSHeader,
  ConsoleMarkdownRenderer
} from '@/components/console';

interface CallResult {
  id: string;
  markdown?: string;
  metadata?: {
    score: number;
    effectiveness: string;
  };
  version?: string;
  overall_score?: number;
  overall_grade?: string;
}

export default function CallResultPage() {
  const params = useParams();
  const router = useRouter();
  const [result, setResult] = useState<CallResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const id = params.id as string;
        const response = await fetch(`/api/analyze/call?id=${id}`);

        if (!response.ok) {
          throw new Error('Failed to fetch call result');
        }

        const data = await response.json();
        setResult(data.result);
      } catch (err) {
        console.error('Error fetching result:', err);
        setError(err instanceof Error ? err.message : 'Failed to load result');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchResult();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">⚡</div>
          <p className="text-[#666] font-mono tracking-wider">LOADING RESULT...</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-black py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <SalesOSHeader systemStatus="READY" />
          <ConsolePanel>
            <div className="text-center py-12">
              <div className="text-4xl mb-4">⚠️</div>
              <ConsoleHeading level={2} variant="yellow" className="mb-4">
                RESULT NOT FOUND
              </ConsoleHeading>
              <p className="text-[#666] font-poppins mb-6">
                {error || 'This call result could not be found.'}
              </p>
              <Link href="/dashboard">
                <ConsoleButton>
                  ← BACK TO DASHBOARD
                </ConsoleButton>
              </Link>
            </div>
          </ConsolePanel>
        </div>
      </div>
    );
  }

  const isPro = result.version === 'pro';

  return (
    <div className="min-h-screen bg-black py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <SalesOSHeader systemStatus="READY" />

        {/* Navigation */}
        <div className="flex justify-between items-center mb-6">
          <Link href="/dashboard">
            <ConsoleButton variant="secondary">
              ← DASHBOARD
            </ConsoleButton>
          </Link>
          <Link href="/call-lab">
            <ConsoleButton>
              + NEW ANALYSIS
            </ConsoleButton>
          </Link>
        </div>

        {/* Result Display */}
        {result.markdown ? (
          <ConsolePanel>
            {!isPro && (
              <ConsoleHeading level={1} variant="yellow" className="mb-6">
                CALL LAB LITE - DIAGNOSTIC SNAPSHOT
              </ConsoleHeading>
            )}
            <ConsoleMarkdownRenderer content={result.markdown} />
          </ConsolePanel>
        ) : (
          <ConsolePanel>
            <div className="text-center py-12">
              <ConsoleHeading level={2} variant="yellow" className="mb-4">
                CALL SCORE: {result.overall_score ?? '--'}/10
              </ConsoleHeading>
              <p className="text-[#B3B3B3] font-poppins">
                Grade: {result.overall_grade || 'N/A'}
              </p>
            </div>
          </ConsolePanel>
        )}

        {/* Pro Upgrade CTA for Lite results */}
        {!isPro && (
          <ConsolePanel variant="red-highlight" className="mt-6">
            <div className="text-center space-y-4">
              <ConsoleHeading level={2} variant="yellow">
                WANT DEEPER INSIGHTS?
              </ConsoleHeading>
              <p className="text-[#B3B3B3] font-poppins max-w-lg mx-auto">
                Upgrade to Call Lab Pro for pattern library, trust acceleration map, tactical rewrites, and more.
              </p>
              <Link href="/call-lab-pro">
                <ConsoleButton>
                  [ UPGRADE TO PRO ]
                </ConsoleButton>
              </Link>
            </div>
          </ConsolePanel>
        )}
      </div>
    </div>
  );
}
