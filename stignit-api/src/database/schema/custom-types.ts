import { customType } from 'drizzle-orm/pg-core';
import { decryptField, encryptField } from '../../common/crypto/field-crypto';

/**
 * AES-256-GCM encrypted text column (PRD 11.1). Encryption/decryption happens
 * transparently at the driver boundary — services read/write plaintext, the DB
 * only ever holds ciphertext. Mirrors the old TypeORM transformer behaviour.
 */
export const encryptedText = customType<{ data: string; driverData: string }>({
  dataType: () => 'text',
  toDriver: (value: string): string => encryptField(value),
  fromDriver: (value: string): string => decryptField(value),
});

/** Encrypted JSON blob (e.g. medical info). */
export const encryptedJson = <T>() =>
  customType<{ data: T; driverData: string }>({
    dataType: () => 'text',
    toDriver: (value: T): string => encryptField(JSON.stringify(value)),
    fromDriver: (value: string): T => JSON.parse(decryptField(value)) as T,
  });

/**
 * PostGIS geography(Point,4326). Values are written via raw `sql`` (ST_MakePoint)
 * and never selected directly, so we only need the DDL type here.
 */
export const geographyPoint = customType<{ data: string; driverData: string }>({
  dataType: () => 'geography(Point,4326)',
});
