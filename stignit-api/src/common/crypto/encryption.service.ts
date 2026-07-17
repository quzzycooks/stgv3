import { Injectable } from '@nestjs/common';
import { blindIndex, decryptField, encryptField } from './field-crypto';

/**
 * Injectable wrapper over the field-crypto primitives, for use in services
 * (e.g. computing a phone blind index during login lookup).
 */
@Injectable()
export class EncryptionService {
  encrypt(plaintext: string): string {
    return encryptField(plaintext);
  }

  decrypt(envelope: string): string {
    return decryptField(envelope);
  }

  /** Deterministic keyed hash for equality lookups on encrypted fields. */
  blindIndex(value: string): string {
    return blindIndex(value);
  }
}
