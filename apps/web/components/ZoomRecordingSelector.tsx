'use client';

import { useState, useEffect } from 'react';

interface ZoomRecording {
  uuid: string;
  id: number;
  topic: string;
  start_time: string;
  duration: number;
  displayDate: string;
  displayDuration: string;
  hasTranscript: boolean;
}

interface ZoomRecordingSelectorProps {
  onSelect: (transcript: { text: string; title: string; participants: string[] }) => void;
}

export function ZoomRecordingSelector({ onSelect }: ZoomRecordingSelectorProps) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [recordings, setRecordings] = useState<ZoomRecording[]>([]);
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
      const response = await fetch('/api/integrations/zoom/status');
      if (response.ok) {
        const data = await response.json();
        setConnected(data.connected);
      }
    } catch (err) {
      console.error('Failed to check Zoom status:', err);
      setConnected(false);
    }
  };

  const loadRecordings = async () => {
    if (!connected) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/integrations/zoom/recordings');
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to load recordings');
        return;
      }

      setRecordings(data.recordings || []);
    } catch (err) {
      setError('Failed to load recordings');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    if (recordings.length === 0 && connected) {
      loadRecordings();
    }
  };

  const handleSelectRecording = async (uuid: string) => {
    setLoadingTranscript(uuid);
    setError(null);

    try {
      // Double-encode UUID if it contains special characters
      const encodedUuid = encodeURIComponent(uuid);
      const response = await fetch(`/api/integrations/zoom/recordings/${encodedUuid}/transcript`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to load transcript');
        return;
      }

      onSelect({
        text: data.transcript.formattedText,
        title: data.transcript.topic || 'Zoom Recording',
        participants: [], // Zoom VTT parsing extracts speakers inline
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
            <span className="text-lg">📹</span>
            <span className="text-[#B3B3B3] text-sm">Import from Zoom</span>
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
            <span className="text-lg">📹</span>
            <span className="text-[#B3B3B3] text-sm group-hover:text-white transition">
              Import from Zoom
            </span>
          </div>
          <span className="text-[#666] text-xs">Click to browse recordings</span>
        </button>
      )}

      {/* Recording Selector Panel */}
      {isOpen && (
        <div className="bg-[#111] border border-[#FFDE59] rounded-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-[#333]">
            <div className="flex items-center gap-2">
              <span className="text-lg">📹</span>
              <span className="text-white font-medium text-sm">Select a Recording</span>
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
                Loading recordings...
              </div>
            ) : error ? (
              <div className="p-4 text-center">
                <p className="text-[#E51B23] text-sm mb-2">{error}</p>
                <button
                  type="button"
                  onClick={loadRecordings}
                  className="text-xs text-[#FFDE59] hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : recordings.length === 0 ? (
              <div className="p-4 text-center text-[#666] text-sm">
                No recordings found. Make sure you have cloud recordings with transcripts enabled.
              </div>
            ) : (
              <div className="divide-y divide-[#222]">
                {recordings.map((recording) => (
                  <button
                    key={recording.uuid}
                    type="button"
                    onClick={() => handleSelectRecording(recording.uuid)}
                    disabled={loadingTranscript === recording.uuid || !recording.hasTranscript}
                    className="w-full p-3 text-left hover:bg-[#1A1A1A] transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {recording.topic || 'Untitled Meeting'}
                        </p>
                        <p className="text-[#666] text-xs mt-0.5">
                          {recording.displayDate}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[#B3B3B3] text-xs">
                          {recording.displayDuration}
                        </p>
                        {recording.hasTranscript ? (
                          <p className="text-[#FFDE59] text-xs">
                            Transcript available
                          </p>
                        ) : (
                          <p className="text-[#666] text-xs">
                            No transcript
                          </p>
                        )}
                      </div>
                    </div>
                    {loadingTranscript === recording.uuid && (
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
          {!loading && recordings.length > 0 && (
            <div className="p-2 border-t border-[#333] text-center">
              <button
                type="button"
                onClick={loadRecordings}
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
