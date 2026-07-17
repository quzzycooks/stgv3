import { rankHospitals, scoreHospital } from './hospital-scoring';

describe('hospital scoring (PRD 6.7.4)', () => {
  const near = { hospitalId: 'near', traumaLevel: 2, distanceMeters: 1000, availability: 0.9, hasCathLab: false };
  const trauma = { hospitalId: 'trauma', traumaLevel: 4, distanceMeters: 8000, availability: 0.5, hasCathLab: true };

  it('weights trauma 40 / distance 35 / availability 25', () => {
    // A max hospital scores 1.0; an empty one scores 0.
    expect(scoreHospital({ hospitalId: 'x', traumaLevel: 4, distanceMeters: 0, availability: 1, hasCathLab: true })).toBeCloseTo(1);
    expect(scoreHospital({ hospitalId: 'y', traumaLevel: 0, distanceMeters: 30000, availability: 0, hasCathLab: false })).toBeCloseTo(0);
  });

  it('treats unknown availability as neutral (0.5)', () => {
    const known = scoreHospital({ ...near, availability: 0.5 });
    const unknown = scoreHospital({ ...near, availability: null });
    expect(unknown).toBeCloseTo(known);
  });

  it('deprioritizes a non-cath-lab hospital for cardiac cases', () => {
    const withCardiac = scoreHospital(near, { needsCardiac: true });
    const withoutCardiac = scoreHospital(near, { needsCardiac: false });
    expect(withCardiac).toBeLessThan(withoutCardiac);
  });

  it('ranks a high-capability hospital above a closer basic one for cardiac', () => {
    const ranked = rankHospitals([near, trauma], { needsCardiac: true });
    expect(ranked[0].hospitalId).toBe('trauma');
  });
});
