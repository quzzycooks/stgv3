/**
 * Hospital Recommendation scoring (PRD 6.7.4): weighted composite of
 * trauma capability (40%), distance/travel-time (35%), current availability
 * (25%, when a partner API is connected). Opted-out hospitals are excluded by
 * the caller. Known medical conditions influence capability matching.
 */
export interface HospitalCandidate {
  hospitalId: string;
  traumaLevel: number; // 0..4 (PRD: trauma center level)
  distanceMeters: number;
  availability: number | null; // 0..1, null when not connected
  hasCathLab: boolean;
}

export interface ScoringOptions {
  maxDistanceMeters?: number;
  needsCardiac?: boolean; // e.g. MEDICAL_COLLAPSE + cardiac history
}

const W_TRAUMA = 0.4;
const W_DISTANCE = 0.35;
const W_AVAILABILITY = 0.25;

export function scoreHospital(h: HospitalCandidate, opts: ScoringOptions = {}): number {
  const maxDist = opts.maxDistanceMeters ?? 30_000;

  const traumaScore = Math.max(0, Math.min(h.traumaLevel, 4)) / 4;
  const distanceScore = 1 - Math.min(h.distanceMeters / maxDist, 1);
  // Unknown availability → neutral 0.5 so a connected hospital isn't unfairly beaten.
  const availabilityScore = h.availability ?? 0.5;

  let score =
    W_TRAUMA * traumaScore + W_DISTANCE * distanceScore + W_AVAILABILITY * availabilityScore;

  // Capability matching (PRD 6.7.4): a cardiac case strongly prefers a cath lab.
  if (opts.needsCardiac && !h.hasCathLab) score *= 0.5;

  return score;
}

export function rankHospitals(
  candidates: HospitalCandidate[],
  opts: ScoringOptions = {},
): Array<HospitalCandidate & { score: number }> {
  return candidates
    .map((h) => ({ ...h, score: scoreHospital(h, opts) }))
    .sort((a, b) => b.score - a.score);
}
