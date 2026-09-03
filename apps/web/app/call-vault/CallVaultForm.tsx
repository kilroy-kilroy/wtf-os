'use client';

import { useEffect, useState } from 'react';
import { ConsolePanel, ConsoleHeading, ConsoleInput, ConsoleButton } from '@/components/console';
import { SERVICES, REVENUE_BANDS, type Option } from '@/lib/call-vault/vocabularies';
import { MAX_CALLS_PER_CONTRIBUTOR } from '@/lib/call-vault/validate';
import CallUploader from './CallUploader';
import NdaModal from './NdaModal';

export const SESSION_STORAGE_KEY = 'call-vault-session';

type Phase = 'restoring' | 'about' | 'resumeSent' | 'calls' | 'done';

interface ContributorProfile {
  name: string;
  email: string;
  agencyName: string | null;
  agencyUrl: string | null;
  targetClient: string | null;
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
  const [ndaOpen, setNdaOpen] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);

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
  const [callIds, setCallIds] = useState<string[]>(() => [makeLocalId()]);
  const [createdCount, setCreatedCount] = useState(0);
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
        setNdaSigned(!!data.contributor.ndaSigned);
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
      setNdaSigned(false);
      setPhase('calls');
    } catch (err) {
      setAboutError(err instanceof Error ? err.message : 'Something broke');
    } finally {
      setAboutBusy(false);
    }
  }

  function addCall() {
    setCallIds((ids) => (ids.length >= MAX_CALLS_PER_CONTRIBUTOR ? ids : [...ids, makeLocalId()]));
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
      </ConsolePanel>
    );
  }

  if (phase === 'calls') {
    if (!sessionToken) {
      return (
        <ConsolePanel className="text-center">
          <p className="font-poppins text-sm text-[#E51B23]">
            We lost track of your session. Please refresh the page.
          </p>
        </ConsolePanel>
      );
    }
    return (
      <div className="flex flex-col gap-6">
        <ConsolePanel>
          {ndaSigned ? (
            <p className="font-poppins text-sm text-[#22c55e]">NDA signed ✓ &mdash; thank you.</p>
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

        <div className="flex flex-col gap-6">
          {callIds.map((id) => (
            <CallUploader
              key={id}
              sessionToken={sessionToken}
              canRemove={callIds.length > 1}
              onRemove={() => removeCall(id)}
              onCallCreated={() => setCreatedCount((n) => n + 1)}
            />
          ))}
        </div>

        <ConsoleButton
          type="button"
          variant="ghost"
          onClick={addCall}
          disabled={callIds.length >= MAX_CALLS_PER_CONTRIBUTOR}
          fullWidth
        >
          {callIds.length >= MAX_CALLS_PER_CONTRIBUTOR
            ? `Call limit reached (${MAX_CALLS_PER_CONTRIBUTOR})`
            : '+ Add another call'}
        </ConsoleButton>

        {submitError && <p className="font-poppins text-sm text-[#E51B23]">{submitError}</p>}

        <ConsoleButton type="button" onClick={submitAll} disabled={submitBusy || createdCount === 0} fullWidth>
          {submitBusy ? 'Submitting…' : 'Submit for review'}
        </ConsoleButton>

        {ndaOpen && (
          <NdaModal
            sessionToken={sessionToken}
            defaultLegalName={profile?.agencyName || profile?.name || ''}
            onSigned={() => {
              setNdaSigned(true);
              setNdaOpen(false);
            }}
            onClose={() => setNdaOpen(false)}
          />
        )}
      </div>
    );
  }

  return (
    <ConsolePanel>
      <form onSubmit={submitAbout} className="flex flex-col gap-5">
        {resumeError && <p className="font-poppins text-sm text-[#E51B23]">{resumeError}</p>}

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

        {aboutError && <p className="font-poppins text-sm text-[#E51B23]">{aboutError}</p>}

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
