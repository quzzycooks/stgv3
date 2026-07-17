import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type Db } from '../../database/drizzle.module';
import { AccessLevel } from '../../database/enums';
import { users } from '../../database/schema';
import { first } from '../../database/util';

export const MIN_ACCESS_LEVEL_KEY = 'minAccessLevel';
/** Require at least the given tier. Enforced against the DB, not token claims. */
export const MinAccessLevel = (level: AccessLevel) => SetMetadata(MIN_ACCESS_LEVEL_KEY, level);

const RANK: Record<AccessLevel, number> = {
  [AccessLevel.OBSERVER]: 0,
  [AccessLevel.TIER1]: 1,
  [AccessLevel.TIER2]: 2,
  [AccessLevel.SKILLED]: 3,
};

/**
 * Tier gate. Re-reads the user's CURRENT access level from the database so a
 * stale/elevated token claim can never grant access (PRD 11.2).
 */
@Injectable()
export class AccessLevelGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(DRIZZLE) private readonly db: Db,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<AccessLevel>(MIN_ACCESS_LEVEL_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required) return true;

    const req = ctx.switchToHttp().getRequest();
    const userId: string | undefined = req.user?.userId;
    if (!userId) throw new UnauthorizedException();

    const user = first(
      await this.db.select({ accessLevel: users.accessLevel }).from(users).where(eq(users.id, userId)).limit(1),
    );
    if (!user) throw new UnauthorizedException();

    const level = user.accessLevel as AccessLevel;
    if (RANK[level] < RANK[required]) {
      throw new ForbiddenException(`Requires ${required} access or higher`);
    }
    req.user.accessLevel = level;
    return true;
  }
}
