import { randomBytes } from 'node:crypto';
import {
  __resetCryptoCache,
  blindIndex,
  blindIndexEquals,
  decryptField,
  encryptField,
} from './field-crypto';

describe('field-crypto (AES-256-GCM + blind index)', () => {
  const KEY = randomBytes(32).toString('base64');
  const PREV = randomBytes(32).toString('base64');

  beforeEach(() => {
    process.env.FIELD_ENCRYPTION_KEY = KEY;
    delete process.env.FIELD_ENCRYPTION_KEY_PREVIOUS;
    process.env.BLIND_INDEX_KEY = 'test-blind-index-key-0123456789ab';
    __resetCryptoCache();
  });

  it('round-trips plaintext', () => {
    const pt = '+2348012345678';
    expect(decryptField(encryptField(pt))).toBe(pt);
  });

  it('produces non-deterministic ciphertext (fresh IV each time)', () => {
    expect(encryptField('Adaeze')).not.toBe(encryptField('Adaeze'));
  });

  it('never leaks plaintext into the envelope', () => {
    expect(encryptField('SECRET-CONDITION')).not.toContain('SECRET-CONDITION');
  });

  it('rejects tampered ciphertext (GCM auth tag)', () => {
    const env = encryptField('trusted');
    const parts = env.split(':');
    const ct = Buffer.from(parts[3], 'base64');
    ct[0] ^= 0xff;
    parts[3] = ct.toString('base64');
    expect(() => decryptField(parts.join(':'))).toThrow();
  });

  it('rejects a malformed envelope', () => {
    expect(() => decryptField('not-an-envelope')).toThrow('Malformed');
  });

  it('decrypts with the previous key during rotation', () => {
    // Encrypt under PREV, then rotate: PREV becomes previous, KEY becomes current.
    process.env.FIELD_ENCRYPTION_KEY = PREV;
    __resetCryptoCache();
    const env = encryptField('rotate-me');

    process.env.FIELD_ENCRYPTION_KEY = KEY;
    process.env.FIELD_ENCRYPTION_KEY_PREVIOUS = PREV;
    __resetCryptoCache();
    expect(decryptField(env)).toBe('rotate-me');
  });

  it('blind index is deterministic and comparable in constant time', () => {
    const a = blindIndex('+2348012345678');
    const b = blindIndex(' +2348012345678 '); // trimmed → same
    expect(a).toBe(b);
    expect(blindIndexEquals(a, b)).toBe(true);
    expect(blindIndexEquals(a, blindIndex('+2348000000000'))).toBe(false);
  });
});
