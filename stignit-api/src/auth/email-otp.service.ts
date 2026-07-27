import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';
import { EmailService } from '../notification/email.service';
import { OtpRequestResult, OtpVerifyResult } from './otp.service';

/**
 * Email-OTP lifecycle — parallel to OtpService (PRD 6.1.1 alt. signup flow),
 * but keyed by emailHash and delivered via EmailService instead of SmsService.
 * Kept as a separate class rather than sharing OtpService's implementation so
 * the phone flow (already shipped, PRD-cited, covered by its own tests) is
 * untouched by this change; the lockout/hashing logic below is intentionally
 * identical to OtpService's — keep the two in sync if either changes.
 */
@Injectable()
export class EmailOtpService {
  private readonly logger = new Logger(EmailOtpService.name);
  private readonly ttlSec = 300; // 5 min
  private readonly maxAttempts = 3;
  private readonly lockSec = 900; // 15 min
  private readonly resendCooldownSec = 30;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly email: EmailService,
  ) {}

  private otpKey(h: string) {
    return `otp:email:code:${h}`;
  }
  private attemptsKey(h: string) {
    return `otp:email:attempts:${h}`;
  }
  private lockKey(h: string) {
    return `otp:email:lock:${h}`;
  }
  private cooldownKey(h: string) {
    return `otp:email:cooldown:${h}`;
  }

  private hashCode(emailHash: string, code: string): string {
    return createHmac('sha256', process.env.BLIND_INDEX_KEY ?? 'dev')
      .update(`${emailHash}:${code}`)
      .digest('hex');
  }

  async isLocked(emailHash: string): Promise<boolean> {
    return (await this.redis.exists(this.lockKey(emailHash))) === 1;
  }

  /** Issue a new OTP and deliver it by email. Returns cooldown; throws if locked or on cooldown. */
  async request(emailHash: string, email: string): Promise<OtpRequestResult> {
    if (await this.isLocked(emailHash)) {
      const ttl = await this.redis.ttl(this.lockKey(emailHash));
      return { resendInSec: Math.max(ttl, 0) };
    }
    const onCooldown = await this.redis.set(
      this.cooldownKey(emailHash),
      '1',
      'EX',
      this.resendCooldownSec,
      'NX',
    );
    if (onCooldown === null) {
      const ttl = await this.redis.ttl(this.cooldownKey(emailHash));
      return { resendInSec: Math.max(ttl, 0) };
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    await this.redis.set(this.otpKey(emailHash), this.hashCode(emailHash, code), 'EX', this.ttlSec);
    await this.redis.del(this.attemptsKey(emailHash)); // fresh attempt budget

    try {
      await this.email.send(
        email,
        'Your Stignit verification code',
        `Your Stignit verification code is ${code}. It expires in 5 minutes.`,
      );
    } catch (err) {
      // Delivery failed — undo the issue so the user can retry immediately
      // rather than being stuck behind a cooldown for a code they never got.
      await this.redis.del(this.otpKey(emailHash), this.cooldownKey(emailHash));
      this.logger.error(`OTP email delivery failed: ${(err as Error).message}`);
      throw err;
    }

    const result: OtpRequestResult = { resendInSec: this.resendCooldownSec };
    if (process.env.NODE_ENV !== 'production') result.devCode = code;
    return result;
  }

  async verify(emailHash: string, code: string): Promise<OtpVerifyResult> {
    if (await this.isLocked(emailHash)) return { ok: false, reason: 'locked' };

    const stored = await this.redis.get(this.otpKey(emailHash));
    if (!stored) return { ok: false, reason: 'no_otp' };

    const provided = this.hashCode(emailHash, code);
    const a = Buffer.from(stored, 'hex');
    const b = Buffer.from(provided, 'hex');
    const match = a.length === b.length && timingSafeEqual(a, b);

    if (match) {
      await this.redis.del(this.otpKey(emailHash), this.attemptsKey(emailHash));
      return { ok: true };
    }

    const attempts = await this.redis.incr(this.attemptsKey(emailHash));
    if (attempts === 1) await this.redis.expire(this.attemptsKey(emailHash), this.ttlSec);
    if (attempts >= this.maxAttempts) {
      await this.redis.set(this.lockKey(emailHash), '1', 'EX', this.lockSec);
      await this.redis.del(this.otpKey(emailHash), this.attemptsKey(emailHash));
      this.logger.warn(`Email OTP lockout for emailHash=${emailHash.slice(0, 8)}…`);
      return { ok: false, reason: 'locked' };
    }
    return { ok: false, reason: 'mismatch', retriesLeft: this.maxAttempts - attempts };
  }
}
