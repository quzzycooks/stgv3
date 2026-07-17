import { randomInt } from 'node:crypto';

// Crockford-ish base32 without ambiguous chars (no I, L, O, U).
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Generate an Incident ID: STIGNIT-YYYY-MM-DD-XXXXXX (PRD §9, ≤26 chars).
 * The 6-char random suffix (32^6 ≈ 1.07B) makes same-day collisions rare;
 * the caller inserts with the PK constraint and retries on the (unique)
 * violation, so uniqueness is guaranteed under concurrency.
 */
export function generateIncidentId(now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  let suffix = '';
  for (let i = 0; i < 6; i++) suffix += ALPHABET[randomInt(0, ALPHABET.length)];
  return `STIGNIT-${y}-${m}-${d}-${suffix}`;
}
