'use client';

import { useEffect, useState } from 'react';
import { ConsoleButton, ConsoleInput, ConsoleHeading } from '@/components/console';

const FIRMA_ORIGIN = 'https://app.firma.dev';

export default function NdaModal({
  sessionToken,
  defaultLegalName,
  onSigned,
  onClose,
  onSessionExpired,
}: {
  sessionToken: string;
  defaultLegalName: string;
  onSigned: () => void;
  onClose: () => void;
  /** Called on a 401 from /nda or /nda/confirm — the parent clears the stale
   * token and moves the whole form to its expired-session state. */
  onSessionExpired: () => void;
}) {
  const [legalName, setLegalName] = useState(defaultLegalName);
  const [address, setAddress] = useState('');
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Set once a `signing.completed` postMessage has fired but /nda/confirm's
  // own re-verification came back `signed: false` (or failed outright) — the
  // postMessage is not proof, so this is the "still waiting on the real
  // answer" state, distinct from `error`.
  const [confirmPending, setConfirmPending] = useState(false);
  const [checkingConfirm, setCheckingConfirm] = useState(false);

  function runConfirm() {
    setCheckingConfirm(true);
    fetch('/api/call-vault/nda/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-call-vault-session': sessionToken },
    })
      .then(async (r) => {
        if (r.status === 401) {
          onSessionExpired();
          return;
        }
        const data = await r.json().catch(() => ({ signed: false }));
        // The postMessage only drives UI — this is the actual answer. Only a
        // true `signed` gets treated as success; anything else (false, or a
        // request that failed) leaves the contributor in the pending state
        // rather than falsely telling them the NDA is done.
        if (data.signed) {
          onSigned();
        } else {
          setConfirmPending(true);
        }
      })
      .catch(() => setConfirmPending(true))
      .finally(() => setCheckingConfirm(false));
  }

  // Firma posts signing.started / completed / declined / error from its own
  // origin, but ANY page can call postMessage — so nothing here is trusted
  // until the origin is checked. Even then, `signing.completed` only drives
  // the UI: the actual signature is re-verified server-side by /nda/confirm
  // (via runConfirm above), which polls Firma directly rather than trusting
  // this event.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== FIRMA_ORIGIN) return;
      const type = (event.data as { type?: string })?.type;
      if (type === 'signing.completed') {
        runConfirm();
      } else if (type === 'signing.declined') {
        onClose();
      } else if (type === 'signing.error') {
        setError('Signing failed. You can try again, or close this and contribute without an NDA.');
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
    // `runConfirm` closes over sessionToken/onSigned/onSessionExpired and is
    // recreated every render, so listing it here (rather than its individual
    // captures) re-attaches the listener with a fresh closure each render —
    // cheap, and it keeps this from ever calling a stale callback.
  }, [runConfirm, onClose]);

  async function prepare() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/call-vault/nda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-call-vault-session': sessionToken },
        body: JSON.stringify({ legalName, address }),
      });
      if (res.status === 401) {
        onSessionExpired();
        return;
      }
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

            {checkingConfirm && !confirmPending && (
              <p className="font-poppins text-sm text-[#B3B3B3]">Confirming your signature…</p>
            )}

            {confirmPending && (
              <div className="flex flex-col gap-3 rounded border border-[#333333] bg-[#1a1a1a] p-4">
                <p role="alert" className="font-poppins text-sm text-[#B3B3B3]">
                  We received your signature and are confirming it now &mdash; this can take a
                  moment. You can close this and keep contributing either way; the confirmation
                  finishes on its own once it lands.
                </p>
                <ConsoleButton
                  type="button"
                  variant="secondary"
                  disabled={checkingConfirm}
                  onClick={runConfirm}
                  className="self-start"
                >
                  {checkingConfirm ? 'Checking…' : 'Check again'}
                </ConsoleButton>
              </div>
            )}

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
