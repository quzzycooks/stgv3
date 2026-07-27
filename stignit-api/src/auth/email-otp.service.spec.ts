import { FakeRedis } from '../test-utils/fake-redis';
import { EmailOtpService } from './email-otp.service';
import { EmailService } from '../notification/email.service';

describe('EmailOtpService', () => {
  let redis: FakeRedis;
  let svc: EmailOtpService;
  const emailHash = 'a'.repeat(64);
  const email = 'user@example.com';

  beforeEach(() => {
    process.env.BLIND_INDEX_KEY = 'test-key';
    process.env.NODE_ENV = 'test';
    redis = new FakeRedis();
    // No RESEND_API_KEY configured — EmailService takes its stub (no-network) path.
    const emailService = new EmailService({ get: () => undefined } as any);
    svc = new EmailOtpService(redis as any, emailService);
  });

  it('issues a code and verifies it (single-use)', async () => {
    const { devCode } = await svc.request(emailHash, email);
    expect(devCode).toMatch(/^\d{6}$/);
    expect(await svc.verify(emailHash, devCode!)).toEqual({ ok: true });
    // consumed — second verify fails with no_otp
    expect(await svc.verify(emailHash, devCode!)).toMatchObject({ ok: false, reason: 'no_otp' });
  });

  it('locks out after 3 failed attempts', async () => {
    const { devCode } = await svc.request(emailHash, email);
    const wrong = devCode === '000000' ? '111111' : '000000';
    expect(await svc.verify(emailHash, wrong)).toMatchObject({ reason: 'mismatch', retriesLeft: 2 });
    expect(await svc.verify(emailHash, wrong)).toMatchObject({ reason: 'mismatch', retriesLeft: 1 });
    expect(await svc.verify(emailHash, wrong)).toMatchObject({ reason: 'locked' });
    expect(await svc.isLocked(emailHash)).toBe(true);
    // even the correct code is refused while locked
    expect(await svc.verify(emailHash, devCode!)).toMatchObject({ reason: 'locked' });
  });

  it('enforces resend cooldown', async () => {
    await svc.request(emailHash, email);
    const second = await svc.request(emailHash, email);
    expect(second.devCode).toBeUndefined();
    expect(second.resendInSec).toBeGreaterThan(0);
  });
});
