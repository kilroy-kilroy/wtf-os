'use client';

import { useState, useEffect } from 'react';

interface FirefliesStatus {
  connected: boolean;
  connectedAt?: string;
  userEmail?: string;
  userName?: string;
}

export function FirefliesIntegration() {
  const [status, setStatus] = useState<FirefliesStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Fetch connection status on mount
  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/integrations/fireflies/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch Fireflies status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      setError('Please enter your API key');
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      const response = await fetch('/api/integrations/fireflies/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to connect');
        return;
      }

      // Success - refresh status
      setShowApiKeyInput(false);
      setApiKey('');
      await fetchStatus();
    } catch (err) {
      setError('Connection failed. Please try again.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Fireflies?')) {
      return;
    }

    setConnecting(true);

    try {
      const response = await fetch('/api/integrations/fireflies/disconnect', {
        method: 'POST',
      });

      if (response.ok) {
        setStatus({ connected: false });
      }
    } catch (err) {
      console.error('Failed to disconnect:', err);
    } finally {
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-between py-3 border-b border-[#222]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#111] border border-[#333] rounded flex items-center justify-center">
            <span className="text-lg">🔥</span>
          </div>
          <div>
            <span className="text-white font-medium">Fireflies.ai</span>
            <p className="text-xs text-[#666]">Auto-import call transcripts</p>
          </div>
        </div>
        <div className="text-[#666] text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="py-3 border-b border-[#222]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#111] border border-[#333] rounded flex items-center justify-center">
            <span className="text-lg">🔥</span>
          </div>
          <div>
            <span className="text-white font-medium">Fireflies.ai</span>
            <p className="text-xs text-[#666]">
              {status?.connected
                ? `Connected as ${status.userEmail || status.userName || 'user'}`
                : 'Auto-import call transcripts'}
            </p>
          </div>
        </div>

        {status?.connected ? (
          <button
            onClick={handleDisconnect}
            disabled={connecting}
            className="border border-[#E51B23] rounded px-3 py-1.5 text-[#E51B23] text-sm hover:bg-[#E51B23] hover:text-white transition disabled:opacity-50"
          >
            {connecting ? 'Disconnecting...' : 'Disconnect'}
          </button>
        ) : showApiKeyInput ? (
          <button
            onClick={() => setShowApiKeyInput(false)}
            className="border border-[#333] rounded px-3 py-1.5 text-[#666] text-sm hover:border-[#E51B23] hover:text-white transition"
          >
            Cancel
          </button>
        ) : (
          <button
            onClick={() => setShowApiKeyInput(true)}
            className="border border-[#FFDE59] rounded px-3 py-1.5 text-[#FFDE59] text-sm hover:bg-[#FFDE59] hover:text-black transition"
          >
            Connect
          </button>
        )}
      </div>

      {/* API Key Input Form */}
      {showApiKeyInput && !status?.connected && (
        <div className="mt-4 p-4 bg-[#111] border border-[#333] rounded">
          <p className="text-xs text-[#B3B3B3] mb-3">
            Get your API key from{' '}
            <a
              href="https://app.fireflies.ai/integrations/custom/fireflies"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#FFDE59] hover:underline"
            >
              Fireflies Integrations
            </a>
          </p>

          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Fireflies API key"
              className="flex-1 bg-black border border-[#333] rounded px-3 py-2 text-white text-sm placeholder-[#666] focus:border-[#FFDE59] focus:outline-none"
            />
            <button
              onClick={handleConnect}
              disabled={connecting || !apiKey.trim()}
              className="bg-[#FFDE59] text-black px-4 py-2 rounded text-sm font-medium hover:bg-[#FFE87A] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {connecting ? 'Connecting...' : 'Connect'}
            </button>
          </div>

          {error && (
            <p className="text-xs text-[#E51B23] mt-2">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
