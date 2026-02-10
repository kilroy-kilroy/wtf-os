'use client';

import { useState, useEffect } from 'react';

interface FridaySubmission {
  id: string;
  user_email: string;
  user_name: string | null;
  company_name: string | null;
  program_name: string;
  week_of: string;
  worked_on: string;
  working_on_next: string;
  concerned_about: string | null;
  happy_about: string | null;
  whats_in_the_way: string | null;
  submitted_at: string;
  has_response: boolean;
}

export default function AdminFiveMinuteFridayPage() {
  const [apiKey, setApiKey] = useState('');
  const [authed, setAuthed] = useState(false);
  const [fridays, setFridays] = useState<FridaySubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFriday, setSelectedFriday] = useState<FridaySubmission | null>(null);
  const [responseText, setResponseText] = useState('');
  const [responding, setResponding] = useState(false);
  const [filter, setFilter] = useState<'all' | 'needs_response'>('needs_response');

  useEffect(() => {
    const stored = sessionStorage.getItem('admin_api_key');
    if (stored) {
      setApiKey(stored);
      setAuthed(true);
      loadFridays(stored);
    }
  }, []);

  async function loadFridays(key: string) {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/five-minute-friday', {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFridays(data.fridays || []);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    sessionStorage.setItem('admin_api_key', apiKey);
    setAuthed(true);
    loadFridays(apiKey);
  }

  async function handleRespond(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFriday || !responseText.trim()) return;
    setResponding(true);

    try {
      const res = await fetch('/api/client/five-minute-friday/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          friday_id: selectedFriday.id,
          response_text: responseText,
        }),
      });

      if (res.ok) {
        setResponseText('');
        setSelectedFriday(null);
        loadFridays(apiKey);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to send response');
      }
    } catch (err) {
      alert('Failed to send response');
    }
    setResponding(false);
  }

  const filtered = filter === 'needs_response'
    ? fridays.filter(f => !f.has_response)
    : fridays;

  if (!authed) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <form onSubmit={handleAuth} className="max-w-md w-full space-y-4">
          <h1 className="text-2xl font-anton uppercase text-[#E51B23]">Admin: 5-Minute Friday</h1>
          <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
            placeholder="Admin API Key"
            className="w-full bg-black border border-[#333333] text-white px-4 py-3 focus:border-[#E51B23] focus:outline-none" />
          <button type="submit" className="w-full bg-[#E51B23] text-white py-3 font-anton uppercase">Access</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-anton uppercase text-[#E51B23]">5-Minute Friday</h1>
          <div className="flex gap-3">
            <a href="/admin/clients" className="text-sm border border-[#333333] px-4 py-2 text-[#999999] hover:text-white transition-colors">
              Clients
            </a>
            <a href="/admin" className="text-sm border border-[#333333] px-4 py-2 text-[#999999] hover:text-white transition-colors">
              Main Admin
            </a>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setFilter('needs_response')}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${
              filter === 'needs_response' ? 'bg-[#E51B23] text-white' : 'border border-[#333333] text-[#666666]'
            }`}>
            Needs Response ({fridays.filter(f => !f.has_response).length})
          </button>
          <button onClick={() => setFilter('all')}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${
              filter === 'all' ? 'bg-[#E51B23] text-white' : 'border border-[#333333] text-[#666666]'
            }`}>
            All ({fridays.length})
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* List */}
          <div className="space-y-3">
            {loading ? (
              <p className="text-[#666666]">Loading...</p>
            ) : filtered.length === 0 ? (
              <p className="text-[#666666] py-8 text-center">
                {filter === 'needs_response' ? 'All caught up! No pending responses.' : 'No submissions yet.'}
              </p>
            ) : (
              filtered.map((friday) => (
                <button
                  key={friday.id}
                  onClick={() => { setSelectedFriday(friday); setResponseText(''); }}
                  className={`w-full text-left p-4 border transition-colors ${
                    selectedFriday?.id === friday.id
                      ? 'border-[#E51B23] bg-[#1A1A1A]'
                      : 'border-[#333333] hover:border-[#555555]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white font-bold text-sm">{friday.user_name || friday.user_email}</span>
                    <span className="text-[#666666] text-xs">
                      {new Date(friday.week_of + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="text-[#666666] text-xs">{friday.program_name} {friday.company_name ? `· ${friday.company_name}` : ''}</div>
                  <p className="text-[#999999] text-xs mt-2 line-clamp-2">{friday.worked_on}</p>
                  {friday.has_response && (
                    <span className="inline-block mt-2 text-[10px] bg-green-900 text-green-400 px-2 py-0.5 uppercase">Responded</span>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Detail + Response */}
          <div>
            {selectedFriday ? (
              <div className="border border-[#333333] p-6 sticky top-6">
                <div className="mb-4">
                  <h3 className="text-lg font-anton uppercase text-[#FFDE59]">
                    {selectedFriday.user_name || selectedFriday.user_email}
                  </h3>
                  <p className="text-[#666666] text-xs">
                    {selectedFriday.program_name} &middot; Week of{' '}
                    {new Date(selectedFriday.week_of + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <div className="text-[11px] tracking-[2px] text-[#E51B23] uppercase mb-1">Worked On</div>
                    <p className="text-[#cccccc] text-sm whitespace-pre-wrap">{selectedFriday.worked_on}</p>
                  </div>
                  <div>
                    <div className="text-[11px] tracking-[2px] text-[#E51B23] uppercase mb-1">Working On Next</div>
                    <p className="text-[#cccccc] text-sm whitespace-pre-wrap">{selectedFriday.working_on_next}</p>
                  </div>
                  {selectedFriday.concerned_about && (
                    <div>
                      <div className="text-[11px] tracking-[2px] text-[#E51B23] uppercase mb-1">Concerned About</div>
                      <p className="text-[#cccccc] text-sm whitespace-pre-wrap">{selectedFriday.concerned_about}</p>
                    </div>
                  )}
                  {selectedFriday.happy_about && (
                    <div>
                      <div className="text-[11px] tracking-[2px] text-[#E51B23] uppercase mb-1">Happy About</div>
                      <p className="text-[#cccccc] text-sm whitespace-pre-wrap">{selectedFriday.happy_about}</p>
                    </div>
                  )}
                  {selectedFriday.whats_in_the_way && (
                    <div>
                      <div className="text-[11px] tracking-[2px] text-[#E51B23] uppercase mb-1">What&apos;s In The Way</div>
                      <p className="text-[#cccccc] text-sm whitespace-pre-wrap">{selectedFriday.whats_in_the_way}</p>
                    </div>
                  )}
                </div>

                {/* Response Form */}
                <form onSubmit={handleRespond} className="border-t border-[#333333] pt-4">
                  <label className="block text-[11px] tracking-[2px] text-[#FFDE59] uppercase mb-2">Your Response</label>
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Write your response... (this will be emailed to the client)"
                    rows={4}
                    required
                    className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none resize-none mb-3"
                  />
                  <button type="submit" disabled={responding || !responseText.trim()}
                    className="w-full bg-[#E51B23] text-white py-2 font-anton uppercase hover:bg-red-700 disabled:opacity-50 transition-colors">
                    {responding ? 'Sending...' : 'Send Response'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="border border-[#222222] p-8 text-center text-[#666666]">
                Select a submission to view details and respond
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
