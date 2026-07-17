import { FakeRedis } from '../test-utils/fake-redis';
import { OtpService } from './otp.service';

describe('OtpService', () => {
  let redis: FakeRedis;
  let svc: OtpService;
  const phoneHash = 'a'.repeat(64);

  beforeEach(() => {
    process.env.BLIND_INDEX_KEY = 'test-key';
    process.env.NODE_ENV = 'test';
    redis = new FakeRedis();
    svc = new OtpService(redis as any);
  });

  it('issues a code and verifies it (single-use)', async () => {
    const { devCode } = await svc.request(phoneHash);
    expect(devCode).toMatch(/^\d{6}$/);
    expect(await svc.verify(phoneHash, devCode!)).toEqual({ ok: true });
    // consumed — second verify fails with no_otp
    expect(await svc.verify(phoneHash, devCode!)).toMatchObject({ ok: false, reason: 'no_otp' });
  });

  it('locks out after 3 failed attempts', async () => {
    const { devCode } = await svc.request(phoneHash);
    const wrong = devCode === '000000' ? '111111' : '000000';
    expect(await svc.verify(phoneHash, wrong)).toMatchObject({ reason: 'mismatch', retriesLeft: 2 });
    expect(await svc.verify(phoneHash, wrong)).toMatchObject({ reason: 'mismatch', retriesLeft: 1 });
    expect(await svc.verify(phoneHash, wrong)).toMatchObject({ reason: 'locked' });
    expect(await svc.isLocked(phoneHash)).toBe(true);
    // even the correct code is refused while locked
    expect(await svc.verify(phoneHash, devCode!)).toMatchObject({ reason: 'locked' });
  });

  it('enforces resend cooldown', async () => {
    await svc.request(phoneHash);
    const second = await svc.request(phoneHash);
    expect(second.devCode).toBeUndefined();
    expect(second.resendInSec).toBeGreaterThan(0);
  });
});
