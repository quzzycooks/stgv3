import { AccessLevel } from '../database/enums';

/**
 * Access-level calculation from drill completion (PRD 6.2.2):
 * Tier1 ≥50%, Tier2 ≥70% of all AVAILABLE scenarios. A verified Skilled
 * Responder who is tier-qualified is elevated to SKILLED. Recomputed on every
 * completion and whenever new scenarios are released (which can lower the %).
 */
export function computeAccessLevel(
  completedDistinct: number,
  totalActive: number,
  skillVerified: boolean,
): { level: AccessLevel; pct: number } {
  const pct = totalActive > 0 ? completedDistinct / totalActive : 0;
  let level: AccessLevel;
  if (pct >= 0.7) level = AccessLevel.TIER2;
  else if (pct >= 0.5) level = AccessLevel.TIER1;
  else level = AccessLevel.OBSERVER;

  if (skillVerified && level !== AccessLevel.OBSERVER) level = AccessLevel.SKILLED;
  return { level, pct };
}
