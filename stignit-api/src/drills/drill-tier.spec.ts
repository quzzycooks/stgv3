import { AccessLevel } from '../database/enums';
import { computeAccessLevel } from './drill-tier';

describe('drill tier calculation (PRD 6.2.2)', () => {
  it('gates Tier1 at 50% and Tier2 at 70%', () => {
    expect(computeAccessLevel(4, 10, false).level).toBe(AccessLevel.OBSERVER); // 40%
    expect(computeAccessLevel(5, 10, false).level).toBe(AccessLevel.TIER1); // 50%
    expect(computeAccessLevel(7, 10, false).level).toBe(AccessLevel.TIER2); // 70%
  });

  it('elevates a verified professional to SKILLED once tier-qualified', () => {
    expect(computeAccessLevel(5, 10, true).level).toBe(AccessLevel.SKILLED);
    // verified but not yet tier-qualified stays OBSERVER
    expect(computeAccessLevel(1, 10, true).level).toBe(AccessLevel.OBSERVER);
  });

  it('can downgrade when new scenarios lower the percentage', () => {
    // Was 70% (7/10); 5 new scenarios released → 7/15 = 46% → OBSERVER.
    expect(computeAccessLevel(7, 15, false).level).toBe(AccessLevel.OBSERVER);
  });
});
