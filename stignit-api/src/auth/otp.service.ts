import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';
import { SmsService } from '../notification/sms.service';

export interface OtpRequestResult {
  /** Only returned in non-production so tests / local dev can complete the flow. */
  devCode?: string;
  resendInSec: number;
}

export type OtpVerifyResult =
  | { ok: true }
  | { ok: false; reason: 'locked' | 'expired' | 'mismatch' | 'no_otp'; retriesLeft?: number };

/**
 * OTP lifecycle backed by Redis TTL keys (PRD 6.1.1 / 11.2).
 * - 6-digit code, 5-min expiry
 * - max 3 verify attempts → 15-min lockout
 * - resend cooldown to prevent SMS bombing
 *
 * The code itself is stored HMAC-hashed, never in plaintext, so a Redis dump
 * does not leak live codes. The 3-attempt lockout is the real brute-force gate.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly ttlSec = 300; // 5 min
  private readonly maxAttempts = 3;
  private readonly lockSec = 900; // 15 min
  private readonly resendCooldownSec = 30;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly sms: SmsService,
  ) {}

  private otpKey(h: string) {
    return `otp:code:${h}`;
  }
  private attemptsKey(h: string) {
    return `otp:attempts:${h}`;
  }
  private lockKey(h: string) {
    return `otp:lock:${h}`;
  }
  private cooldownKey(h: string) {
    return `otp:cooldown:${h}`;
  }

  private hashCode(phoneHash: string, code: string): string {
    // Salt with phoneHash so identical codes for different phones differ.
    return createHmac('sha256', process.env.BLIND_INDEX_KEY ?? 'dev')
      .update(`${phoneHash}:${code}`)
      .digest('hex');
  }

  async isLocked(phoneHash: string): Promise<boolean> {
    return (await this.redis.exists(this.lockKey(phoneHash))) === 1;
  }

  /** Issue a new OTP and deliver it by SMS. Returns cooldown; throws if locked or on cooldown. */
  async request(phoneHash: string, phone: string): Promise<OtpRequestResult> {
    if (await this.isLocked(phoneHash)) {
      const ttl = await this.redis.ttl(this.lockKey(phoneHash));
      return { resendInSec: Math.max(ttl, 0) };
    }
    const onCooldown = await this.redis.set(
      this.cooldownKey(phoneHash),
      '1',
      'EX',
      this.resendCooldownSec,
      'NX',
    );
    if (onCooldown === null) {
      const ttl = await this.redis.ttl(this.cooldownKey(phoneHash));
      return { resendInSec: Math.max(ttl, 0) };
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    await this.redis.set(this.otpKey(phoneHash), this.hashCode(phoneHash, code), 'EX', this.ttlSec);
    await this.redis.del(this.attemptsKey(phoneHash)); // fresh attempt budget

    try {
      await this.sms.send(phone, `Your Stignit verification code is ${code}. It expires in 5 minutes.`);
    } catch (err) {
      // Delivery failed — undo the issue so the user can retry immediately
      // rather than being stuck behind a cooldown for a code they never got.
      await this.redis.del(this.otpKey(phoneHash), this.cooldownKey(phoneHash));
      this.logger.error(`OTP SMS delivery failed: ${(err as Error).message}`);
      throw err;
    }

    // In production the code is delivered ONLY via SMS (Sendchamp). Never logged.
    const result: OtpRequestResult = { resendInSec: this.resendCooldownSec };
    if (process.env.NODE_ENV !== 'production') result.devCode = code;
    return result;
  }

  async verify(phoneHash: string, code: string): Promise<OtpVerifyResult> {
    if (await this.isLocked(phoneHash)) return { ok: false, reason: 'locked' };

    const stored = await this.redis.get(this.otpKey(phoneHash));
    if (!stored) return { ok: false, reason: 'no_otp' };

    const provided = this.hashCode(phoneHash, code);
    const a = Buffer.from(stored, 'hex');
    const b = Buffer.from(provided, 'hex');
    const match = a.length === b.length && timingSafeEqual(a, b);

    if (match) {
      // Single-use: consume everything on success.
      await this.redis.del(this.otpKey(phoneHash), this.attemptsKey(phoneHash));
      return { ok: true };
    }

    const attempts = await this.redis.incr(this.attemptsKey(phoneHash));
    if (attempts === 1) await this.redis.expire(this.attemptsKey(phoneHash), this.ttlSec);
    if (attempts >= this.maxAttempts) {
      await this.redis.set(this.lockKey(phoneHash), '1', 'EX', this.lockSec);
      await this.redis.del(this.otpKey(phoneHash), this.attemptsKey(phoneHash));
      this.logger.warn(`OTP lockout for phoneHash=${phoneHash.slice(0, 8)}…`);
      return { ok: false, reason: 'locked' };
    }
    return { ok: false, reason: 'mismatch', retriesLeft: this.maxAttempts - attempts };
  }
}
