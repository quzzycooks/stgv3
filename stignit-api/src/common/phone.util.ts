import { BadRequestException } from '@nestjs/common';

/**
 * Normalize a Nigerian phone number to E.164 (+234XXXXXXXXXX).
 * Accepts: 08012345678, 8012345678, +2348012345678, 2348012345678.
 * PRD 6.1.1 requires +234 E.164 as the primary identifier.
 */
export function normalizeNigerianPhone(input: string): string {
  const digits = input.replace(/[^\d+]/g, '');
  let e164: string;
  if (digits.startsWith('+234')) e164 = digits;
  else if (digits.startsWith('234')) e164 = `+${digits}`;
  else if (digits.startsWith('0')) e164 = `+234${digits.slice(1)}`;
  else if (/^[789]\d{9}$/.test(digits)) e164 = `+234${digits}`;
  else e164 = digits.startsWith('+') ? digits : `+234${digits}`;

  if (!/^\+234[789]\d{9}$/.test(e164)) {
    throw new BadRequestException('Invalid Nigerian phone number');
  }
  return e164;
}
