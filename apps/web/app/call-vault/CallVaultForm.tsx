'use client';

import { useEffect, useState } from 'react';
import { ConsolePanel, ConsoleHeading, ConsoleInput, ConsoleButton } from '@/components/console';
import {
  SERVICES, REVENUE_BANDS, STAGES, OUTCOMES, DEAL_SIZE_BANDS, labelFor, type Option,
} from '@/lib/call-vault/vocabularies';
import { MAX_CALLS_PER_CONTRIBUTOR } from '@/lib/call-vault/validate';
import CallUploader from './CallUploader';
import NdaModal from './NdaModal';

export const SESSION_STORAGE_KEY = 'call-vault-session';
// Companion flag to the session token. Not a credential — just UI state — so a
// same-tab refresh does not forget that the NDA is already executed and hide
// the contributor's download link. Server state is always authoritative: the
// /nda route still answers {alreadySigned:true} regardless of what this says.
const NDA_SIGNED_STORAGE_KEY = 'call-vault-nda-signed';

type Phase = 'restoring' | 'about' | 'resumeSent' | 'calls' | 'expired' | 'done';

interface ContributorProfile {
  name: string;
  email: string;
  agencyName: string | null;
  agencyUrl: string | null;
  targetClient: string | null;
}

/** A previously-saved call, returned read-only by /resume so a returning
 * contributor can see what they already have instead of discovering the
 * 10-call cap as a bare 400 on an 11th blank card. */
interface ExistingCall {
  id: string;
  stage: string | null;
  outcome: string | null;
  dealSizeBand: string | null;
  label: string | null;
  fileCount: number;
}

/** A `<select>` styled to match ConsoleInput's look — there is no ConsoleSelect. */
export function LabeledSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="block font-anton uppercase text-[#FFDE59] text-sm tracking-wide">
        {label}
      </label>
      <select
        className="w-full bg-[#1a1a1a] border border-[#333333] text-white font-poppins rounded px-4 py-3 focus:outline-none focus:border-[#FFDE59] focus:ring-1 focus:ring-[#FFDE59] disabled:opacity-50"
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder ?? 'Select…'}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function CallVaultForm({ resumeToken }: { resumeToken: string | null }) {
  const [phase, setPhase] = useState<Phase>(resumeToken ? 'restoring' : 'about');
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<ContributorProfile | null>(null);
  const [ndaSigned, setNdaSigned] = useState(false);
  const [ndaDownloading, setNdaDownloading] = useState(false);
  const [ndaDownloadError, setNdaDownloadError] = useState<string | null>(null);
  const [ndaOpen, setNdaOpen] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [existingCalls, setExistingCalls] = useState<ExistingCall[]>([]);

  // About-you fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [agencyUrl, setAgencyUrl] = useState('');
  const [services, setServices] = useState<string[]>([]);
  const [revenueBand, setRevenueBand] = useState<string | null>(null);
  const [targetClient, setTargetClient] = useState('');
  const [consent, setConsent] = useState(false);
  const [aboutBusy, setAboutBusy] = useState(false);
  const [aboutError, setAboutError] = useState<string | null>(null);

  // Calls phase
  // Five blank rows up front: that is the number the page asks for, and an
  // empty row costs nothing — a call row only reaches the server once a file
  // is attached to it.
  const [callIds, setCallIds] = useState<string[]>(
    () => Array.from({ length: 5 }, () => makeLocalId()),
  );
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // On mount: either consume a resume link (?token=...), or pick a session
  // already in this tab back up after a refresh (sessionStorage), or start fresh.
  useEffect(() => {
    let cancelled = false;

    async function restoreFromToken(token: string) {
      try {
        const res = await fetch(`/api/call-vault/resume?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'That link has expired');
        if (cancelled) return;
        setSessionToken(data.sessionToken);
        try {
          sessionStorage.setItem(SESSION_STORAGE_KEY, data.sessionToken);
        } catch {
          // sessionStorage unavailable (private mode) — the session still works
          // for this page load, it just won't survive a refresh.
        }
        setProfile({
          name: data.contributor.name,
          email: data.contributor.email,
          agencyName: data.contributor.agencyName,
          agencyUrl: data.contributor.agencyUrl,
          targetClient: data.contributor.targetClient,
        });
        markNdaSignedLocally(!!data.contributor.ndaSigned);
        const calls: ExistingCall[] = Array.isArray(data.calls) ? data.calls : [];
        setExistingCalls(calls);
        // If the contributor is already at (or somehow over) the cap, don't
        // start them off with a blank card they can't use.
        if (calls.length >= MAX_CALLS_PER_CONTRIBUTOR) {
          setCallIds([]);
        }
        setPhase('calls');
      } catch (err) {
        if (cancelled) return;
        setResumeError(err instanceof Error ? err.message : 'That link has expired');
        setPhase('about');
      }
    }

    if (resumeToken) {
      restoreFromToken(resumeToken);
      return () => {
        cancelled = true;
      };
    }

    try {
      const storedNda = (() => {
        try { return sessionStorage.getItem(NDA_SIGNED_STORAGE_KEY) === '1'; } catch { return false; }
      })();
      if (storedNda) setNdaSigned(true);
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        setSessionToken(stored);
        setPhase('calls');
        return;
      }
    } catch {
      // sessionStorage unavailable — fall through to a fresh start.
    }
    setPhase('about');

    return () => {
      cancelled = true;
    };
  }, [resumeToken]);

  function toggleService(value: string) {
    setServices((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  // Shared 401 handler: on any expired/invalid session (from /calls, /files,
  // /nda, /nda/confirm, or /submit), drop the stale token everywhere it lives
  // and move to a dedicated terminal state rather than leaving a dead-end
  // "Session expired" line sitting next to still-disabled controls.
  function handleSessionExpired() {
    setSessionToken(null);
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      sessionStorage.removeItem(NDA_SIGNED_STORAGE_KEY);
    } catch {
      // ignore — nothing else to clean up if storage isn't available
    }
    setPhase('expired');
  }

  async function submitAbout(e: React.FormEvent) {
    e.preventDefault();
    setAboutBusy(true);
    setAboutError(null);
    try {
      const res = await fetch('/api/call-vault/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          agencyName: agencyName || null,
          agencyUrl: agencyUrl || null,
          services,
          revenueBand,
          targetClient: targetClient || null,
          termsAccepted: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error ||
            (res.status === 429
              ? 'Too many submissions from this network. Try again later.'
              : 'Something broke'),
        );
      }
      if (data.resumeEmailed) {
        setPhase('resumeSent');
        return;
      }
      setSessionToken(data.sessionToken);
      try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, data.sessionToken);
      } catch {
        // sessionStorage unavailable — session still works for this page load.
      }
      setProfile({
        name,
        email,
        agencyName: agencyName || null,
        agencyUrl: agencyUrl || null,
        targetClient: targetClient || null,
      });
      markNdaSignedLocally(false);
      setExistingCalls([]);
      setPhase('calls');
    } catch (err) {
      setAboutError(err instanceof Error ? err.message : 'Something broke');
    } finally {
      setAboutBusy(false);
    }
  }

  const totalCalls = existingCalls.length + callIds.length;

  function addCall() {
    setCallIds((ids) => (existingCalls.length + ids.length >= MAX_CALLS_PER_CONTRIBUTOR ? ids : [...ids, makeLocalId()]));
  }

  function removeCall(id: string) {
    setCallIds((ids) => ids.filter((x) => x !== id));
  }

  async function submitAll() {
    if (!sessionToken) return;
    setSubmitBusy(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/call-vault/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-call-vault-session': sessionToken },
      });
      if (res.status === 401) {
        handleSessionExpired();
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not complete your submission');
      setPhase('done');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not complete your submission');
    } finally {
      setSubmitBusy(false);
    }
  }

  if (phase === 'restoring') {
    return (
      <ConsolePanel className="text-center">
        <p className="font-poppins text-[#B3B3B3]">Restoring your session…</p>
      </ConsolePanel>
    );
  }

  if (phase === 'resumeSent') {
    return (
      <ConsolePanel className="text-center">
        <ConsoleHeading level={2} variant="yellow" className="normal-case">
          Check your inbox
        </ConsoleHeading>
        <p className="mt-3 font-poppins text-[#B3B3B3]">
          We already have a submission going for that email. We just emailed you a link to pick
          up right where you left off &mdash; no need to start over.
        </p>
      </ConsolePanel>
    );
  }

  if (phase === 'expired') {
    return (
      <ConsolePanel className="text-center">
        <ConsoleHeading level={2} variant="yellow" className="normal-case">
          Session timed out
        </ConsoleHeading>
        <p role="alert" className="mt-3 font-poppins text-[#B3B3B3]">
          Your session expired. Any calls you already uploaded are safely saved &mdash; nothing is
          lost. Enter your email again below and we&apos;ll send you a link to pick up right where
          you left off.
        </p>
        <ConsoleButton
          type="button"
          className="mt-5"
          onClick={() => {
            if (profile) {
              setName(profile.name);
              setEmail(profile.email);
              setAgencyName(profile.agencyName ?? '');
              setAgencyUrl(profile.agencyUrl ?? '');
              setTargetClient(profile.targetClient ?? '');
            }
            setAboutError(null);
            setPhase('about');
          }}
        >
          Back to start
        </ConsoleButton>
      </ConsolePanel>
    );
  }


  /** Set the signed flag and mirror it to sessionStorage so a refresh keeps it. */
  function markNdaSignedLocally(signed: boolean) {
    setNdaSigned(signed);
    try {
      if (signed) sessionStorage.setItem(NDA_SIGNED_STORAGE_KEY, '1');
      else sessionStorage.removeItem(NDA_SIGNED_STORAGE_KEY);
    } catch {
      // sessionStorage unavailable (private mode) — the flag simply won't survive
      // a refresh, which is the pre-existing behaviour, not a regression.
    }
  }

  /**
   * Fetch a short-lived signed URL for this contributor's executed NDA and open
   * it. Done as a POST rather than a plain link because the session lives in a
   * header, not a cookie — see app/api/call-vault/nda/file/route.ts.
   */
  async function downloadNda() {
    if (!sessionToken) return;
    setNdaDownloadError(null);
    setNdaDownloading(true);
    try {
      const res = await fetch('/api/call-vault/nda/file', {
        method: 'POST',
        headers: { 'x-call-vault-session': sessionToken },
      });
      if (res.status === 401) {
        handleSessionExpired();
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not fetch your signed NDA');
      window.open(data.url as string, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setNdaDownloadError(err instanceof Error ? err.message : 'Could not fetch your signed NDA');
    } finally {
      setNdaDownloading(false);
    }
  }

  if (phase === 'done') {
    return (
      <ConsolePanel className="text-center">
        <ConsoleHeading level={2} variant="yellow" className="normal-case">
          You&apos;re in.
        </ConsoleHeading>
        <p className="mt-3 font-poppins text-[#B3B3B3]">
          Thanks{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''} &mdash; we&apos;ve got
          your calls. We&apos;ll put together your individualized improvement plan and follow up
          to schedule your 30-minute review call.
        </p>
        {ndaSigned && (
          <div className="mt-5">
            <ConsoleButton type="button" variant="secondary" onClick={downloadNda} disabled={ndaDownloading}>
              {ndaDownloading ? 'Preparing…' : 'Download your signed NDA'}
            </ConsoleButton>
            {ndaDownloadError && (
              <p role="alert" className="mt-2 font-poppins text-xs text-[#E51B23]">
                {ndaDownloadError}
              </p>
            )}
          </div>
        )}
      </ConsolePanel>
    );
  }

  if (phase === 'calls') {
    if (!sessionToken) {
      return (
        <ConsolePanel className="text-center">
          <p role="alert" className="font-poppins text-sm text-[#E51B23]">
            We lost track of your session. Please refresh the page.
          </p>
        </ConsolePanel>
      );
    }
    return (
      <div className="flex flex-col gap-6">
        <ConsolePanel>
          {ndaSigned ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-poppins text-sm text-[#22c55e]">NDA signed ✓ &mdash; thank you.</p>
                {ndaDownloadError && (
                  <p role="alert" className="mt-1 font-poppins text-xs text-[#E51B23]">
                    {ndaDownloadError}
                  </p>
                )}
              </div>
              <ConsoleButton
                type="button"
                variant="secondary"
                onClick={downloadNda}
                disabled={ndaDownloading}
              >
                {ndaDownloading ? 'Preparing…' : 'Download your copy'}
              </ConsoleButton>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-poppins text-sm text-[#B3B3B3]">
                Want an NDA first? It signs right here &mdash; no email, no waiting.
              </p>
              <ConsoleButton type="button" variant="secondary" onClick={() => setNdaOpen(true)}>
                Sign the NDA
              </ConsoleButton>
            </div>
          )}
        </ConsolePanel>

        {existingCalls.length > 0 && (
          <ConsolePanel>
            <h3 className="font-anton uppercase tracking-wide text-sm text-[#FFDE59]">
              Calls you&apos;ve already saved ({existingCalls.length})
            </h3>
            <ul className="mt-3 flex flex-col gap-2">
              {existingCalls.map((c) => (
                <li
                  key={c.id}
                  className="rounded border border-[#333333] px-3 py-2 font-poppins text-sm text-[#B3B3B3]"
                >
                  {/* The stage stands in as the title when there is no label,
                      so it is only repeated in the detail line when a real
                      label took the title slot. */}
                  <span className="text-white">{c.label || labelFor(STAGES, c.stage)}</span>
                  {' — '}
                  {c.label ? <>{labelFor(STAGES, c.stage)} &middot; </> : null}
                  {labelFor(OUTCOMES, c.outcome)} &middot;{' '}
                  {labelFor(DEAL_SIZE_BANDS, c.dealSizeBand)}
                  {' — '}
                  {c.fileCount} file{c.fileCount === 1 ? '' : 's'}
                </li>
              ))}
            </ul>
          </ConsolePanel>
        )}

        <div className="flex flex-col gap-6">
          {callIds.map((id, i) => (
            <CallUploader
              index={existingCalls.length + i + 1}
              key={id}
              sessionToken={sessionToken}
              canRemove={callIds.length > 1}
              onRemove={() => removeCall(id)}
              onSessionExpired={handleSessionExpired}
            />
          ))}
        </div>

        <ConsoleButton
          type="button"
          variant="ghost"
          onClick={addCall}
          disabled={totalCalls >= MAX_CALLS_PER_CONTRIBUTOR}
          fullWidth
        >
          {totalCalls >= MAX_CALLS_PER_CONTRIBUTOR
            ? `Call limit reached (${MAX_CALLS_PER_CONTRIBUTOR})`
            : '+ Add another call'}
        </ConsoleButton>

        {submitError && (
          <p role="alert" className="font-poppins text-sm text-[#E51B23]">
            {submitError}
          </p>
        )}

        <ConsoleButton
          type="button"
          onClick={submitAll}
          disabled={submitBusy}
          fullWidth
        >
          {submitBusy ? 'Submitting…' : 'Submit for review'}
        </ConsoleButton>

        {ndaOpen && (
          <NdaModal
            sessionToken={sessionToken}
            defaultLegalName={profile?.agencyName || profile?.name || ''}
            onSigned={() => {
              markNdaSignedLocally(true);
              setNdaOpen(false);
            }}
            onClose={() => setNdaOpen(false)}
            onSessionExpired={() => {
              setNdaOpen(false);
              handleSessionExpired();
            }}
          />
        )}
      </div>
    );
  }

  return (
    <ConsolePanel>
      <form onSubmit={submitAbout} className="flex flex-col gap-5">
        {resumeError && (
          <p role="alert" className="font-poppins text-sm text-[#E51B23]">
            {resumeError}
          </p>
        )}

        <ConsoleInput
          label="Your name"
          required
          value={name}
          onChange={(e) => setName((e.target as HTMLInputElement).value)}
          placeholder="Jane Smith"
        />
        <ConsoleInput
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
          placeholder="you@youragency.com"
        />
        <ConsoleInput
          label="Agency name"
          value={agencyName}
          onChange={(e) => setAgencyName((e.target as HTMLInputElement).value)}
          placeholder="Acme Growth Co."
        />
        <ConsoleInput
          label="Agency website"
          value={agencyUrl}
          onChange={(e) => setAgencyUrl((e.target as HTMLInputElement).value)}
          placeholder="youragency.com"
        />

        <div className="space-y-2">
          <label className="block font-anton uppercase text-[#FFDE59] text-sm tracking-wide">
            Services you sell
          </label>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
            {SERVICES.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2 font-poppins text-sm text-white"
              >
                <input
                  type="checkbox"
                  checked={services.includes(opt.value)}
                  onChange={() => toggleService(opt.value)}
                  className="h-4 w-4 accent-[#E51B23]"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <LabeledSelect
          label="Annual agency revenue"
          value={revenueBand}
          onChange={setRevenueBand}
          options={REVENUE_BANDS}
          placeholder="Prefer not to say"
        />

        <ConsoleInput
          label="Who's your target client?"
          multiline
          rows={3}
          value={targetClient}
          onChange={(e) => setTargetClient((e.target as HTMLTextAreaElement).value)}
          placeholder="e.g. B2B SaaS, $5-20M ARR, VP Marketing buyer"
        />

        <label className="flex items-start gap-3 font-poppins text-sm text-[#B3B3B3]">
          <input
            type="checkbox"
            required
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 h-4 w-4 accent-[#E51B23]"
          />
          <span>
            I have the rights and consents necessary to share these calls, and I grant KLRY LLC
            the right to create and use anonymized, aggregated insights from them.
          </span>
        </label>

        {aboutError && (
          <p role="alert" className="font-poppins text-sm text-[#E51B23]">
            {aboutError}
          </p>
        )}

        <ConsoleButton type="submit" disabled={aboutBusy} fullWidth>
          {aboutBusy ? 'Starting…' : 'Continue'}
        </ConsoleButton>
      </form>
    </ConsolePanel>
  );
}

function makeLocalId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
