import { FakeRedis } from '../test-utils/fake-redis';
import { OtpService } from './otp.service';
import { SmsService } from '../notification/sms.service';

describe('OtpService', () => {
  let redis: FakeRedis;
  let svc: OtpService;
  const phoneHash = 'a'.repeat(64);
  const phone = '+2348012345678';

  beforeEach(() => {
    process.env.BLIND_INDEX_KEY = 'test-key';
    process.env.NODE_ENV = 'test';
    redis = new FakeRedis();
    // No SENDCHAMP_API_KEY configured — SmsService takes its stub (no-network) path.
    const sms = new SmsService({ get: () => undefined } as any);
    svc = new OtpService(redis as any, sms);
  });

  it('issues a code and verifies it (single-use)', async () => {
    const { devCode } = await svc.request(phoneHash, phone);
    expect(devCode).toMatch(/^\d{6}$/);
    expect(await svc.verify(phoneHash, devCode!)).toEqual({ ok: true });
    // consumed — second verify fails with no_otp
    expect(await svc.verify(phoneHash, devCode!)).toMatchObject({ ok: false, reason: 'no_otp' });
  });

  it('locks out after 3 failed attempts', async () => {
    const { devCode } = await svc.request(phoneHash, phone);
    const wrong = devCode === '000000' ? '111111' : '000000';
    expect(await svc.verify(phoneHash, wrong)).toMatchObject({ reason: 'mismatch', retriesLeft: 2 });
    expect(await svc.verify(phoneHash, wrong)).toMatchObject({ reason: 'mismatch', retriesLeft: 1 });
    expect(await svc.verify(phoneHash, wrong)).toMatchObject({ reason: 'locked' });
    expect(await svc.isLocked(phoneHash)).toBe(true);
    // even the correct code is refused while locked
    expect(await svc.verify(phoneHash, devCode!)).toMatchObject({ reason: 'locked' });
  });

  it('enforces resend cooldown', async () => {
    await svc.request(phoneHash, phone);
    const second = await svc.request(phoneHash, phone);
    expect(second.devCode).toBeUndefined();
    expect(second.resendInSec).toBeGreaterThan(0);
  });
});
