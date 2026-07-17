import { checkAiOutput } from './ai-safety.filter';

describe('AI safety filter (PRD 6.11.3)', () => {
  it('allows protocol-grounded guidance', () => {
    const ok = [
      'Keep the victim still and monitor their breathing until help arrives.',
      'Do not move the person unless there is a fire risk. Reassure them and keep them warm.',
      'If you are trained and they are not breathing, begin standard basic life support.',
    ];
    for (const t of ok) expect(checkAiOutput(t).safe).toBe(true);
  });

  it('blocks medication dosage / administration', () => {
    expect(checkAiOutput('Give 500mg of paracetamol now.').violations).toContain('DOSAGE');
    expect(checkAiOutput('Administer 2 tablets every 4 hours.').violations).toContain('DOSAGE');
    expect(checkAiOutput('Inject 1ml of adrenaline.').violations).toContain('DOSAGE');
  });

  it('blocks diagnosis assertions', () => {
    expect(checkAiOutput('The patient is having a heart attack.').violations).toContain('DIAGNOSIS');
    expect(checkAiOutput('This is diagnosed as a stroke.').violations).toContain('DIAGNOSIS');
    expect(checkAiOutput("It's definitely a fracture.").violations).toContain('DIAGNOSIS');
  });

  it('blocks invasive / surgical instructions', () => {
    expect(checkAiOutput('Make an incision below the ribs.').violations).toContain('INVASIVE');
    expect(checkAiOutput('Insert a needle into the chest.').violations).toContain('INVASIVE');
    expect(checkAiOutput('Try to reset the bone yourself.').violations).toContain('INVASIVE');
  });

  it('flags multiple categories at once', () => {
    const r = checkAiOutput('Diagnose the stroke, then give 5mg and make an incision.');
    expect(r.safe).toBe(false);
    expect(r.violations.sort()).toEqual(['DIAGNOSIS', 'DOSAGE', 'INVASIVE']);
  });
});
