import { createHmac } from 'node:crypto';

/**
 * Deterministic per-incident pseudonymization (PRD 6.9.3): a user id is mapped
 * to a rotating session token scoped to the incident, so the same user gets a
 * stable token WITHIN an incident but an unlinkable token ACROSS incidents.
 *
 * HMAC(key, incidentId:userId) — reversible only with the key, which lives in
 * secrets, never in the anonymized data. Pure + deterministic → testable.
 */
export function sessionToken(incidentId: string, userId: string, key = anonKey()): string {
  return createHmac('sha256', key).update(`${incidentId}:${userId}`).digest('hex').slice(0, 32);
}

function anonKey(): string {
  return process.env.BLIND_INDEX_KEY ?? 'dev-anon-key';
}

/** Fields in an action-log payload that may carry a real user id. */
const USER_ID_FIELDS = [
  'userId',
  'requesterId',
  'targetUserId',
  'moderatorId',
  'triggeringUserId',
];

/**
 * Replace any known user id in a payload with its incident session token.
 * Unknown ids are left as-is only if not in the participant set (they get a
 * token too, computed on the fly) — we tokenize every value in a user-id field.
 */
export function anonymizePayload(
  incidentId: string,
  payload: Record<string, unknown>,
  key = anonKey(),
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...payload };
  for (const field of USER_ID_FIELDS) {
    const val = out[field];
    if (typeof val === 'string') out[field] = sessionToken(incidentId, val, key);
  }
  return out;
}
