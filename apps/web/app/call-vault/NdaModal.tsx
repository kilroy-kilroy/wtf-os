'use client';

import { useEffect, useState } from 'react';
import { ConsoleButton, ConsoleInput, ConsoleHeading } from '@/components/console';

const FIRMA_ORIGIN = 'https://app.firma.dev';

export default function NdaModal({
  sessionToken,
  defaultLegalName,
  onSigned,
  onClose,
}: {
  sessionToken: string;
  defaultLegalName: string;
  onSigned: () => void;
  onClose: () => void;
}) {
  const [legalName, setLegalName] = useState(defaultLegalName);
  const [address, setAddress] = useState('');
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Firma posts signing.started / completed / declined / error from its own
  // origin, but ANY page can call postMessage — so nothing here is trusted
  // until the origin is checked. Even then, `signing.completed` only drives
  // the UI: the actual signature is re-verified server-side by /nda/confirm,
  // which polls Firma directly rather than trusting this event.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== FIRMA_ORIGIN) return;
      const type = (event.data as { type?: string })?.type;
      if (type === 'signing.completed') {
        fetch('/api/call-vault/nda/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-call-vault-session': sessionToken },
        })
          .then((r) => r.json())
          .then(() => onSigned())
          .catch(() => onSigned()); // the webhook is the durable backstop either way
      } else if (type === 'signing.declined') {
        onClose();
      } else if (type === 'signing.error') {
        setError('Signing failed. You can try again, or close this and contribute without an NDA.');
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [sessionToken, onSigned, onClose]);

  async function prepare() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/call-vault/nda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-call-vault-session': sessionToken },
        body: JSON.stringify({ legalName, address }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not prepare the NDA. You can skip it and still contribute.');
      }
      // Idempotent server response: an already-signed contributor gets this
      // shape back instead of a signingUrl — never reopen a signed envelope.
      if (data.alreadySigned) {
        onSigned();
        return;
      }
      setSigningUrl(data.signingUrl);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Could not prepare the NDA. You can skip it and still contribute.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sign the NDA"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-auto rounded-lg border border-[#E51B23] bg-black p-6">
        {!signingUrl ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              prepare();
            }}
            className="flex flex-col gap-4"
          >
            <ConsoleHeading level={3} variant="yellow" className="normal-case">
              Sign the confidentiality agreement
            </ConsoleHeading>
            <p className="font-poppins text-sm text-[#B3B3B3]">
              Two details for the agreement, then you can sign right here &mdash; no email, no
              waiting.
            </p>
            <ConsoleInput
              label="Legal entity name"
              required
              value={legalName}
              onChange={(e) => setLegalName((e.target as HTMLInputElement).value)}
              placeholder="Acme Growth Co., LLC"
            />
            <ConsoleInput
              label="Business address"
              required
              value={address}
              onChange={(e) => setAddress((e.target as HTMLInputElement).value)}
              placeholder="123 Main St, Springfield, USA"
            />
            {error && (
              <p role="alert" className="font-poppins text-sm text-[#E51B23]">
                {error}
              </p>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <ConsoleButton type="submit" disabled={busy} className="flex-1">
                {busy ? 'Preparing…' : error ? 'Try again' : 'Continue to sign'}
              </ConsoleButton>
              <ConsoleButton type="button" variant="ghost" onClick={onClose}>
                Skip the NDA
              </ConsoleButton>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <iframe
              src={signingUrl}
              className="h-[75vh] w-full rounded border-0"
              allow="camera;microphone;clipboard-write"
              title="Sign the confidentiality agreement"
            />
            {error && (
              <p role="alert" className="font-poppins text-sm text-[#E51B23]">
                {error}
              </p>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              {error && (
                <ConsoleButton
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setError(null);
                    setSigningUrl(null);
                  }}
                >
                  Try again
                </ConsoleButton>
              )}
              <ConsoleButton type="button" variant="ghost" onClick={onClose}>
                Close &mdash; contribute without an NDA
              </ConsoleButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
