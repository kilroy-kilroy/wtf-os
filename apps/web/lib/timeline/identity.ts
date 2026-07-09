const FREE_MAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'ymail.com', 'hotmail.com',
  'outlook.com', 'live.com', 'msn.com', 'aol.com', 'icloud.com', 'me.com',
  'mac.com', 'proton.me', 'protonmail.com', 'gmx.com', 'mail.com',
]);

export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  // exactly one @, non-empty local part, domain with a dot
  const match = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.exec(trimmed);
  return match ? trimmed : null;
}

export function deriveDomain(email: string): string | null {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  return normalized.split('@')[1] ?? null;
}

export function isFreeMailDomain(domain: string): boolean {
  return FREE_MAIL_DOMAINS.has(domain.trim().toLowerCase());
}
