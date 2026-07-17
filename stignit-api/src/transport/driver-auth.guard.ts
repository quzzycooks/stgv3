import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

/**
 * Driver-app authentication — separate identity space from mobile users and
 * admins. Drivers present a driver-scoped JWT (typ='driver') minted at
 * onboarding by Ops. Attaches req.driverId. Fails closed.
 */
@Injectable()
export class DriverAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers?.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Missing driver token');
    try {
      const claims = this.jwt.verify(header.slice(7), {
        secret: this.config.get('jwt.accessSecret'),
      });
      if (claims.typ !== 'driver') throw new Error('wrong token type');
      req.driverId = claims.sub;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid driver token');
    }
  }
}
