import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type Redis from 'ioredis';
import { AccessLevel } from '../database/enums';
import { REDIS_CLIENT } from '../redis/redis.module';

export interface AccessClaims {
  sub: string;
  accessLevel: AccessLevel;
  typ: 'access';
}
export interface RefreshClaims {
  sub: string;
  jti: string;
  fam: string;
  typ: 'refresh';
}
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * JWT issuance with **rotating** refresh tokens and reuse detection (PRD 11.2).
 *
 * A refresh token belongs to a "family" (fam). Each rotation invalidates the
 * old jti and mints a new one in the same family. If a jti that has already
 * been rotated (or a revoked one) is presented, that is a theft signal → the
 * ENTIRE family is revoked, forcing re-authentication.
 *
 * Access-token claims (accessLevel) are a client hint only; incident-sensitive
 * endpoints re-derive authorization from the DB at request time.
 */
@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly refreshTtlSec = 30 * 24 * 60 * 60;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  private jtiKey(jti: string) {
    return `rt:${jti}`;
  }
  private famKey(fam: string) {
    return `rtfam:${fam}`;
  }

  async issuePair(userId: string, accessLevel: AccessLevel, fam?: string): Promise<TokenPair> {
    const family = fam ?? randomUUID();
    const jti = randomUUID();

    const accessToken = await this.jwt.signAsync(
      { sub: userId, accessLevel, typ: 'access' } satisfies AccessClaims,
      { secret: this.config.get('jwt.accessSecret'), expiresIn: this.config.get('jwt.accessTtl') },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: userId, jti, fam: family, typ: 'refresh' } satisfies RefreshClaims,
      {
        secret: this.config.get('jwt.refreshSecret'),
        expiresIn: this.config.get('jwt.refreshTtl'),
      },
    );

    // Track the live jti in its family set (for whole-chain revocation).
    await this.redis
      .multi()
      .set(this.jtiKey(jti), userId, 'EX', this.refreshTtlSec)
      .sadd(this.famKey(family), jti)
      .expire(this.famKey(family), this.refreshTtlSec)
      .exec();

    return { accessToken, refreshToken, expiresIn: 15 * 60 };
  }

  /** Rotate a refresh token. Detects reuse and revokes the family on theft. */
  async rotate(
    refreshToken: string,
    resolveAccessLevel: (userId: string) => Promise<AccessLevel>,
  ): Promise<TokenPair> {
    let claims: RefreshClaims;
    try {
      claims = await this.jwt.verifyAsync<RefreshClaims>(refreshToken, {
        secret: this.config.get('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (claims.typ !== 'refresh') throw new UnauthorizedException('Wrong token type');

    const live = await this.redis.get(this.jtiKey(claims.jti));
    if (!live) {
      // jti is signed & unexpired but not live → already rotated or revoked.
      // Treat as reuse/theft: nuke the whole family.
      await this.revokeFamily(claims.fam);
      this.logger.warn(`Refresh reuse detected; revoked family ${claims.fam} (user ${claims.sub})`);
      throw new UnauthorizedException('Refresh token reuse detected — session revoked');
    }

    // Consume the old jti atomically, then issue a new one in the same family.
    await this.redis.multi().del(this.jtiKey(claims.jti)).srem(this.famKey(claims.fam), claims.jti).exec();
    const accessLevel = await resolveAccessLevel(claims.sub);
    return this.issuePair(claims.sub, accessLevel, claims.fam);
  }

  async revokeFamily(fam: string): Promise<void> {
    const jtis = await this.redis.smembers(this.famKey(fam));
    const pipeline = this.redis.multi();
    for (const jti of jtis) pipeline.del(this.jtiKey(jti));
    pipeline.del(this.famKey(fam));
    await pipeline.exec();
  }

  /** Logout: revoke the family carried by the presented refresh token. */
  async revokeByRefresh(refreshToken: string): Promise<void> {
    try {
      const claims = await this.jwt.verifyAsync<RefreshClaims>(refreshToken, {
        secret: this.config.get('jwt.refreshSecret'),
      });
      await this.revokeFamily(claims.fam);
    } catch {
      /* already invalid — nothing to revoke */
    }
  }
}
