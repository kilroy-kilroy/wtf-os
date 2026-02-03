'use client';

import { useState, useEffect } from 'react';

interface ZoomStatus {
  connected: boolean;
  connectedAt?: string;
  userEmail?: string;
  userName?: string;
}

export function ZoomIntegration() {
  const [status, setStatus] = useState<ZoomStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch connection status on mount
  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/integrations/zoom/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch Zoom status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    // Redirect to OAuth flow
    window.location.href = '/api/integrations/zoom/connect';
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Zoom?')) {
      return;
    }

    setDisconnecting(true);
    setError(null);

    try {
      const response = await fetch('/api/integrations/zoom/disconnect', {
        method: 'POST',
      });

      if (response.ok) {
        setStatus({ connected: false });
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to disconnect');
      }
    } catch (err) {
      console.error('Failed to disconnect:', err);
      setError('Failed to disconnect. Please try again.');
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-between py-3 border-b border-[#222]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#111] border border-[#333] rounded flex items-center justify-center">
            <span className="text-lg">📹</span>
          </div>
          <div>
            <span className="text-white font-medium">Zoom</span>
            <p className="text-xs text-[#666]">Import recordings directly</p>
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
            <span className="text-lg">📹</span>
          </div>
          <div>
            <span className="text-white font-medium">Zoom</span>
            <p className="text-xs text-[#666]">
              {status?.connected
                ? `Connected as ${status.userEmail || status.userName || 'user'}`
                : 'Import recordings directly'}
            </p>
          </div>
        </div>

        {status?.connected ? (
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="border border-[#E51B23] rounded px-3 py-1.5 text-[#E51B23] text-sm hover:bg-[#E51B23] hover:text-white transition disabled:opacity-50"
          >
            {disconnecting ? 'Disconnecting...' : 'Disconnect'}
          </button>
        ) : (
          <button
            onClick={handleConnect}
            className="border border-[#FFDE59] rounded px-3 py-1.5 text-[#FFDE59] text-sm hover:bg-[#FFDE59] hover:text-black transition"
          >
            Connect
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-[#E51B23] mt-2">{error}</p>
      )}

      {status?.connected && status.connectedAt && (
        <p className="text-xs text-[#666] mt-2">
          Connected {new Date(status.connectedAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
