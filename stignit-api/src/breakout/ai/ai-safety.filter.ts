/**
 * AI output safety gate (PRD 6.11.3). This is real output validation, NOT a
 * prompt instruction — even a jailbroken model cannot get prohibited content to
 * the user, because we inspect the generated text and replace it on violation.
 *
 * Prohibited: medication dosages/administration, diagnosis assertions, and
 * surgical/invasive-intervention guidance.
 */
export type ViolationCategory = 'DOSAGE' | 'DIAGNOSIS' | 'INVASIVE';

export interface SafetyResult {
  safe: boolean;
  violations: ViolationCategory[];
}

const DOSAGE_PATTERNS: RegExp[] = [
  /\b\d+(\.\d+)?\s?(mg|milligrams?|mcg|micrograms?|ml|cc|g|grams?|units?|iu|tablets?|pills?|capsules?|doses?|drops?)\b/i,
  /\b(administer|give|inject|take|swallow|dose|dosage|prescrib\w*)\b[^.]{0,40}\b(mg|ml|tablet|pill|capsule|dose|injection|drug|medication|paracetamol|ibuprofen|aspirin|adrenaline|epinephrine|insulin|morphine|diazepam)\b/i,
  /\b(every|each)\s+\d+\s*(hours?|hrs?|minutes?|mins?)\b[^.]{0,30}\b(dose|tablet|pill|mg|ml)\b/i,
];

const DIAGNOSIS_PATTERNS: RegExp[] = [
  /\b(diagnos\w+)\b/i,
  /\b(you|they|he|she|the (victim|patient|person))\s+(have|has|is having|is experiencing|are having)\s+(a|an)\s+[a-z ]{0,30}(heart attack|stroke|cardiac arrest|seizure|fracture|internal bleeding|concussion|overdose|infection|hemorrhage)\b/i,
  /\bit('?s| is)\s+(definitely|certainly|clearly)\s+(a|an)\b/i,
];

const INVASIVE_PATTERNS: RegExp[] = [
  /\b(incision|sutur\w+|scalpel|intubat\w+|tracheotomy|cricothyro\w+|amputat\w+|cauteriz\w+)\b/i,
  /\b(insert|push|force)\s+(a\s+)?(needle|tube|catheter|finger)\s+(into|down|through)\b/i,
  /\b(cut|slice|open up|operate on)\s+(the\s+)?(victim|patient|wound|chest|throat|skin)\b/i,
  /\b(realign|reset|pop back)\s+(the\s+)?(bone|fracture|joint|dislocation)\b/i,
];

export function checkAiOutput(text: string): SafetyResult {
  const violations: ViolationCategory[] = [];
  if (DOSAGE_PATTERNS.some((r) => r.test(text))) violations.push('DOSAGE');
  if (DIAGNOSIS_PATTERNS.some((r) => r.test(text))) violations.push('DIAGNOSIS');
  if (INVASIVE_PATTERNS.some((r) => r.test(text))) violations.push('INVASIVE');
  return { safe: violations.length === 0, violations };
}

export const SAFE_FALLBACK =
  'I can only provide general, protocol-grounded guidance — not diagnosis, medication, or invasive-procedure instructions. Keep the person still and comfortable, ensure the scene is safe, and a verified responder is on the way. If breathing stops and you are trained, begin standard basic life support.';

export const GUIDANCE_DISCLAIMER =
  'This is general guidance, not a medical diagnosis. Always defer to a verified professional on scene.';
