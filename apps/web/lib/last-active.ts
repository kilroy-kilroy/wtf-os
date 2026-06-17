/**
 * Returns the most recent (latest) of a set of timestamps, or null if none are
 * valid. Used to derive a client's true "last active" moment from BOTH signals
 * we track:
 *
 *   - auth.users.last_sign_in_at — updated only on a fresh authentication
 *     (password / magic-link / OAuth). Stays stale for a client who returns
 *     with a live, auto-refreshed session.
 *   - public.users.last_login_at — updated (throttled) by middleware on every
 *     authenticated page visit, so it captures returning-session activity that
 *     last_sign_in_at misses.
 *
 * Taking the max means the dashboard never shows a client as less recent than
 * either signal, fixing the under-reporting where active clients (e.g. weekly
 * Five-Minute-Friday visitors) looked dormant.
 */
export function mostRecent(
  ...timestamps: Array<string | null | undefined>
): string | null {
  let best: number | null = null;
  let bestIso: string | null = null;
  for (const ts of timestamps) {
    if (!ts) continue;
    const t = new Date(ts).getTime();
    if (Number.isNaN(t)) continue;
    if (best === null || t > best) {
      best = t;
      bestIso = ts;
    }
  }
  return bestIso;
}
