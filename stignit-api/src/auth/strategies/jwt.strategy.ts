import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthUser } from '../decorators/current-user.decorator';
import { AccessClaims } from '../token.service';

/**
 * Validates the mobile access JWT. Returns the principal attached to req.user.
 * NOTE: accessLevel here is a hint; incident-scoped guards re-check the DB.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('jwt.accessSecret'),
    });
  }

  validate(payload: AccessClaims): AuthUser {
    if (payload.typ !== 'access')
      throw new UnauthorizedException('Wrong token type');
    return { userId: payload.sub, accessLevel: payload.accessLevel };
  }
}
