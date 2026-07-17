import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

/**
 * AES-256-GCM field-level encryption (PRD 11.1 "Critical — encrypt everywhere").
 *
 * Ciphertext envelope: `v1:<iv b64>:<authTag b64>:<ciphertext b64>`.
 * The version prefix lets us evolve the scheme without ambiguity.
 *
 * Key rotation: a previous key may be configured; decryption tries the current
 * key first, then the previous one, so re-encryption can happen lazily/offline.
 *
 * Keys are read lazily from env because TypeORM ValueTransformers are constructed
 * at module-import time, before Nest's DI container exists.
 */

const VERSION = 'v1';
let cachedKey: Buffer | null = null;
let cachedPrevKey: Buffer | null | undefined; // undefined = not yet resolved
let cachedHmacKey: Buffer | null = null;

function resolveKey(envVar: string): Buffer {
  const raw = process.env[envVar];
  if (!raw) throw new Error(`${envVar} is not set — cannot (de)crypt PII`);
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error(`${envVar} must decode to 32 bytes (got ${key.length})`);
  }
  return key;
}

function currentKey(): Buffer {
  return (cachedKey ??= resolveKey('FIELD_ENCRYPTION_KEY'));
}

function previousKey(): Buffer | null {
  if (cachedPrevKey === undefined) {
    const raw = process.env.FIELD_ENCRYPTION_KEY_PREVIOUS;
    cachedPrevKey = raw ? Buffer.from(raw, 'base64') : null;
    if (cachedPrevKey && cachedPrevKey.length !== 32) {
      throw new Error('FIELD_ENCRYPTION_KEY_PREVIOUS must decode to 32 bytes');
    }
  }
  return cachedPrevKey;
}

function hmacKey(): Buffer {
  if (!cachedHmacKey) {
    const raw = process.env.BLIND_INDEX_KEY;
    if (!raw) throw new Error('BLIND_INDEX_KEY is not set — cannot compute blind index');
    cachedHmacKey = Buffer.from(raw, 'utf8');
  }
  return cachedHmacKey;
}

/** For tests: drop cached keys after mutating process.env. */
export function __resetCryptoCache(): void {
  cachedKey = null;
  cachedPrevKey = undefined;
  cachedHmacKey = null;
}

export function encryptField(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', currentKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}:${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`;
}

function decryptWith(key: Buffer, iv: Buffer, tag: Buffer, ct: Buffer): string {
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}

export function decryptField(envelope: string): string {
  const parts = envelope.split(':');
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error('Malformed ciphertext envelope');
  }
  const [, ivB64, tagB64, ctB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const ct = Buffer.from(ctB64, 'base64');
  try {
    return decryptWith(currentKey(), iv, tag, ct);
  } catch (err) {
    const prev = previousKey();
    if (prev) return decryptWith(prev, iv, tag, ct);
    throw err;
  }
}

/**
 * Deterministic keyed hash for equality lookup on encrypted values (e.g. phone).
 * HMAC-SHA256 so an attacker with DB read access cannot recover the value or
 * brute-force without the key. NOT reversible — pair it with an encrypted column.
 */
export function blindIndex(value: string): string {
  return createHmac('sha256', hmacKey()).update(value.trim()).digest('hex');
}

export function blindIndexEquals(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}
