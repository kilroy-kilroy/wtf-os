'use client';

import { useState, useEffect } from 'react';

interface FirefliesTranscript {
  id: string;
  title: string;
  date: string;
  displayDate: string;
  displayDuration: string;
  participantCount: number;
  participants: string[];
}

interface FirefliesTranscriptSelectorProps {
  onSelect: (transcript: { text: string; title: string; participants: string[] }) => void;
}

export function FirefliesTranscriptSelector({ onSelect }: FirefliesTranscriptSelectorProps) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [transcripts, setTranscripts] = useState<FirefliesTranscript[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTranscript, setLoadingTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Check connection status on mount
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const response = await fetch('/api/integrations/fireflies/status');
      if (response.ok) {
        const data = await response.json();
        setConnected(data.connected);
      }
    } catch (err) {
      console.error('Failed to check Fireflies status:', err);
      setConnected(false);
    }
  };

  const loadTranscripts = async () => {
    if (!connected) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/integrations/fireflies/transcripts?limit=20');
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to load transcripts');
        return;
      }

      setTranscripts(data.transcripts || []);
    } catch (err) {
      setError('Failed to load transcripts');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    if (transcripts.length === 0 && connected) {
      loadTranscripts();
    }
  };

  const handleSelectTranscript = async (transcriptId: string) => {
    setLoadingTranscript(transcriptId);

    try {
      const response = await fetch(`/api/integrations/fireflies/transcripts/${transcriptId}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to load transcript');
        return;
      }

      onSelect({
        text: data.transcript.formattedText,
        title: data.transcript.title,
        participants: data.transcript.participants || [],
      });

      setIsOpen(false);
    } catch (err) {
      setError('Failed to load transcript');
    } finally {
      setLoadingTranscript(null);
    }
  };

  // Don't render if not connected
  if (connected === false) {
    return (
      <div className="mb-4 p-3 bg-[#111] border border-[#333] rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔥</span>
            <span className="text-[#B3B3B3] text-sm">Import from Fireflies</span>
          </div>
          <a
            href="/settings"
            className="text-xs text-[#FFDE59] hover:underline"
          >
            Connect in Settings
          </a>
        </div>
      </div>
    );
  }

  // Loading state
  if (connected === null) {
    return null;
  }

  return (
    <div className="mb-4">
      {/* Toggle Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={handleOpen}
          className="w-full p-3 bg-[#111] border border-[#333] rounded-lg hover:border-[#FFDE59] transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🔥</span>
            <span className="text-[#B3B3B3] text-sm group-hover:text-white transition">
              Import from Fireflies
            </span>
          </div>
          <span className="text-[#666] text-xs">Click to browse calls</span>
        </button>
      )}

      {/* Transcript Selector Panel */}
      {isOpen && (
        <div className="bg-[#111] border border-[#FFDE59] rounded-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-[#333]">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔥</span>
              <span className="text-white font-medium text-sm">Select a Call</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[#666] hover:text-white text-sm"
            >
              Cancel
            </button>
          </div>

          {/* Content */}
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-[#666] text-sm">
                Loading transcripts...
              </div>
            ) : error ? (
              <div className="p-4 text-center">
                <p className="text-[#E51B23] text-sm mb-2">{error}</p>
                <button
                  type="button"
                  onClick={loadTranscripts}
                  className="text-xs text-[#FFDE59] hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : transcripts.length === 0 ? (
              <div className="p-4 text-center text-[#666] text-sm">
                No transcripts found
              </div>
            ) : (
              <div className="divide-y divide-[#222]">
                {transcripts.map((transcript) => (
                  <button
                    key={transcript.id}
                    type="button"
                    onClick={() => handleSelectTranscript(transcript.id)}
                    disabled={loadingTranscript === transcript.id}
                    className="w-full p-3 text-left hover:bg-[#1A1A1A] transition disabled:opacity-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {transcript.title || 'Untitled Call'}
                        </p>
                        <p className="text-[#666] text-xs mt-0.5">
                          {transcript.displayDate}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[#B3B3B3] text-xs">
                          {transcript.displayDuration}
                        </p>
                        <p className="text-[#666] text-xs">
                          {transcript.participantCount} participants
                        </p>
                      </div>
                    </div>
                    {loadingTranscript === transcript.id && (
                      <p className="text-[#FFDE59] text-xs mt-1 animate-pulse">
                        Loading transcript...
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Refresh Button */}
          {!loading && transcripts.length > 0 && (
            <div className="p-2 border-t border-[#333] text-center">
              <button
                type="button"
                onClick={loadTranscripts}
                className="text-xs text-[#666] hover:text-[#FFDE59] transition"
              >
                Refresh list
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
