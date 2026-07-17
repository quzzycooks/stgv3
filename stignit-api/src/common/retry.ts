import { Logger } from '@nestjs/common';

export interface RetryOptions {
  retries?: number; // additional attempts after the first (PRD 7.4: 3)
  baseMs?: number;
  maxMs?: number; // cap (PRD 7.4: 30s)
  label?: string;
}

const logger = new Logger('retry');

/**
 * Exponential backoff with cap, shared by all outbound integrations
 * (notification, institutional, hospital) per PRD 7.4 — 3 retries, ≤30s delay,
 * then surface failure to the caller (which flags for manual follow-up).
 */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const retries = opts.retries ?? 3;
  const baseMs = opts.baseMs ?? 500;
  const maxMs = opts.maxMs ?? 30_000;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries) break;
      const delay = Math.min(baseMs * 2 ** attempt, maxMs);
      logger.warn(
        `${opts.label ?? 'op'} failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${delay}ms: ${(err as Error).message}`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
