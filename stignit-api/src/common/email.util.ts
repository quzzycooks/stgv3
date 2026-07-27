import { BadRequestException } from '@nestjs/common';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Normalize an email address for storage/lookup: trim + lowercase. */
export function normalizeEmail(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (!EMAIL_RE.test(trimmed)) {
    throw new BadRequestException('Invalid email address');
  }
  return trimmed;
}
