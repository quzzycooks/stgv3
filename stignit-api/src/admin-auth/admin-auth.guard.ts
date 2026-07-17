import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { AdminRole, ADMIN_ID_TOKEN_VERIFIER, ADMIN_REGISTRY } from './admin-identity';
import type { AdminIdTokenVerifier, AdminRegistry } from './admin-identity';

export const ADMIN_ROLES_KEY = 'adminRoles';
/** Restrict a dashboard route to specific admin roles (PRD 6.12.3). */
export const AdminRoles = (...roles: AdminRole[]) => SetMetadata(ADMIN_ROLES_KEY, roles);

/**
 * Admin dashboard guard. Verifies the SSO ID token, enforces the allowed
 * hosted domain, resolves the admin account + role from the registry, and
 * enforces per-route role scoping. Fails closed: no admin record → 403.
 * Every admin action is audit-logged downstream (NDPA requirement).
 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
    @Inject(ADMIN_ID_TOKEN_VERIFIER) private readonly verifier: AdminIdTokenVerifier,
    @Inject(ADMIN_REGISTRY) private readonly registry: AdminRegistry,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers?.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Missing admin token');
    const idToken = header.slice(7);

    const { email, hostedDomain } = await this.verifier.verify(idToken);

    const allowedDomain = this.config.get<string>('adminSso.allowedDomain');
    if (allowedDomain && hostedDomain !== allowedDomain && !email.endsWith(`@${allowedDomain}`)) {
      throw new ForbiddenException('Email domain not permitted');
    }

    const admin = await this.registry.findByEmail(email);
    if (!admin) throw new ForbiddenException('No admin account for this identity');
    req.admin = admin;

    const required = this.reflector.getAllAndOverride<AdminRole[]>(ADMIN_ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (required?.length) {
      // Super admin implicitly satisfies any role requirement.
      const ok = admin.role === AdminRole.SUPER_ADMIN || required.includes(admin.role);
      if (!ok) throw new ForbiddenException(`Requires one of: ${required.join(', ')}`);
    }
    return true;
  }
}
