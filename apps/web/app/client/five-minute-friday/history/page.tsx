'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import type { FiveMinuteFriday, FiveMinuteFridayResponse } from '@/types/client';

export default function FridayHistoryPage() {
  const [fridays, setFridays] = useState<(FiveMinuteFriday & { responses: FiveMinuteFridayResponse[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadHistory() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/client/login'); return; }

      const { data } = await supabase
        .from('five_minute_fridays')
        .select('*, responses:five_minute_friday_responses(*)')
        .eq('user_id', user.id)
        .order('week_of', { ascending: false });

      setFridays(data || []);
      setLoading(false);
    }
    loadHistory();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#E51B23] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-anton uppercase text-[#E51B23]">Friday Check-ins</h1>
            <p className="text-[#666666] text-sm mt-1">Your weekly submissions and feedback</p>
          </div>
          <a href="/client/dashboard" className="text-[#666666] hover:text-white text-sm border border-[#333333] px-4 py-2 transition-colors">
            &larr; Dashboard
          </a>
        </div>

        {fridays.length === 0 ? (
          <div className="text-center py-16 text-[#666666]">
            <p className="text-lg mb-4">No check-ins yet</p>
            <a href="/client/five-minute-friday"
              className="inline-block bg-[#E51B23] text-white px-6 py-3 font-anton uppercase hover:bg-red-700 transition-colors">
              Submit Your First
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {fridays.map((friday) => {
              const isExpanded = expandedId === friday.id;
              const hasResponse = friday.responses && friday.responses.length > 0;
              const weekDate = new Date(friday.week_of + 'T00:00:00');

              return (
                <div key={friday.id} className="border border-[#333333] hover:border-[#555555] transition-colors">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : friday.id)}
                    className="w-full text-left p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-[#FFDE59] font-anton text-sm">
                        {weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      {hasResponse && (
                        <span className="bg-[#E51B23] text-white text-[10px] px-2 py-0.5 uppercase tracking-wider font-bold">
                          Response
                        </span>
                      )}
                    </div>
                    <span className="text-[#666666] text-sm">{isExpanded ? '−' : '+'}</span>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-[#222222] p-4 space-y-4">
                      <div>
                        <div className="text-[11px] tracking-[2px] text-[#666666] uppercase mb-1">Worked On</div>
                        <p className="text-[#cccccc] text-sm whitespace-pre-wrap">{friday.worked_on}</p>
                      </div>
                      <div>
                        <div className="text-[11px] tracking-[2px] text-[#666666] uppercase mb-1">Working On Next</div>
                        <p className="text-[#cccccc] text-sm whitespace-pre-wrap">{friday.working_on_next}</p>
                      </div>
                      {friday.concerned_about && (
                        <div>
                          <div className="text-[11px] tracking-[2px] text-[#666666] uppercase mb-1">Concerned About</div>
                          <p className="text-[#cccccc] text-sm whitespace-pre-wrap">{friday.concerned_about}</p>
                        </div>
                      )}
                      {friday.happy_about && (
                        <div>
                          <div className="text-[11px] tracking-[2px] text-[#666666] uppercase mb-1">Happy About</div>
                          <p className="text-[#cccccc] text-sm whitespace-pre-wrap">{friday.happy_about}</p>
                        </div>
                      )}
                      {friday.whats_in_the_way && (
                        <div>
                          <div className="text-[11px] tracking-[2px] text-[#666666] uppercase mb-1">What&apos;s In The Way</div>
                          <p className="text-[#cccccc] text-sm whitespace-pre-wrap">{friday.whats_in_the_way}</p>
                        </div>
                      )}

                      {hasResponse && friday.responses.map((resp) => (
                        <div key={resp.id} className="mt-4 bg-[#111111] border-l-4 border-[#FFDE59] p-4">
                          <div className="text-[11px] tracking-[2px] text-[#FFDE59] uppercase mb-2">Tim&apos;s Response</div>
                          <p className="text-white text-sm whitespace-pre-wrap">{resp.response_text}</p>
                          <p className="text-[#555555] text-xs mt-2">
                            {new Date(resp.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
