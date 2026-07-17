import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccessLevel } from '../database/enums';
import { FakeRedis } from '../test-utils/fake-redis';
import { TokenService } from './token.service';

describe('TokenService (rotating refresh + reuse detection)', () => {
  let svc: TokenService;
  let redis: FakeRedis;

  const config = {
    get: (k: string) =>
      ({
        'jwt.accessSecret': 'access-secret',
        'jwt.accessTtl': '15m',
        'jwt.refreshSecret': 'refresh-secret',
        'jwt.refreshTtl': '30d',
      })[k],
  } as any;

  const level = async () => AccessLevel.TIER1;

  beforeEach(() => {
    redis = new FakeRedis();
    svc = new TokenService(new JwtService(), config, redis as any);
  });

  it('rotates: old refresh token cannot be reused after rotation', async () => {
    const pair = await svc.issuePair('user-1', AccessLevel.OBSERVER);
    const rotated = await svc.rotate(pair.refreshToken, level);
    expect(rotated.refreshToken).not.toBe(pair.refreshToken);

    // Reusing the original (now-rotated) token trips reuse detection.
    await expect(svc.rotate(pair.refreshToken, level)).rejects.toThrow(UnauthorizedException);
  });

  it('revokes the WHOLE family when reuse is detected', async () => {
    const pair = await svc.issuePair('user-1', AccessLevel.OBSERVER);
    const rotated = await svc.rotate(pair.refreshToken, level);

    // Trigger reuse with the stale token → family nuked.
    await expect(svc.rotate(pair.refreshToken, level)).rejects.toThrow(/reuse/i);

    // The freshly-rotated token is also dead now (whole chain revoked).
    await expect(svc.rotate(rotated.refreshToken, level)).rejects.toThrow(UnauthorizedException);
  });

  it('logout revokes the family', async () => {
    const pair = await svc.issuePair('user-1', AccessLevel.OBSERVER);
    await svc.revokeByRefresh(pair.refreshToken);
    await expect(svc.rotate(pair.refreshToken, level)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a token signed with the wrong secret', async () => {
    const forged = await new JwtService().signAsync(
      { sub: 'x', jti: 'j', fam: 'f', typ: 'refresh' },
      { secret: 'attacker', expiresIn: '30d' },
    );
    await expect(svc.rotate(forged, level)).rejects.toThrow(UnauthorizedException);
  });
});
