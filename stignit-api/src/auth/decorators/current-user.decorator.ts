import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AccessLevel } from '../../database/enums';

export interface AuthUser {
  userId: string;
  accessLevel: AccessLevel;
}

/** Injects the authenticated principal (set by JwtStrategy) into a handler. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest();
    return req.user;
  },
);
