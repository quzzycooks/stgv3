import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminAuthGuard, ADMIN_ROLES_KEY } from './admin-auth.guard';
import { AdminRole } from './admin-identity';

/** Cross-role access-control tests for the admin guard (PRD 11.2 / 6.12.3). */
describe('AdminAuthGuard', () => {
  const config = { get: (k: string) => (k === 'adminSso.allowedDomain' ? 'stignit.ng' : undefined) } as any;

  function ctx(requiredRoles: AdminRole[] | undefined): ExecutionContext {
    const req: any = { headers: { authorization: 'Bearer tok' } };
    return {
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => 'h',
      getClass: () => 'c',
      _req: req,
    } as any;
  }

  function guardWith(email: string, role: AdminRole | null) {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) =>
      key === ADMIN_ROLES_KEY ? [AdminRole.OPERATIONS_MANAGER] : undefined,
    );
    const verifier = { verify: jest.fn().mockResolvedValue({ email, hostedDomain: 'stignit.ng' }) };
    const registry = {
      findByEmail: jest.fn().mockResolvedValue(role ? { adminId: 'a1', email, role } : null),
    };
    return new AdminAuthGuard(reflector, config, verifier as any, registry as any);
  }

  it('allows an Operations Manager on an Ops-scoped route', async () => {
    const guard = guardWith('ops@stignit.ng', AdminRole.OPERATIONS_MANAGER);
    await expect(guard.canActivate(ctx([AdminRole.OPERATIONS_MANAGER]))).resolves.toBe(true);
  });

  it('allows a Super Admin on any route (implicit)', async () => {
    const guard = guardWith('boss@stignit.ng', AdminRole.SUPER_ADMIN);
    await expect(guard.canActivate(ctx([AdminRole.OPERATIONS_MANAGER]))).resolves.toBe(true);
  });

  it('DENIES a Content Manager on an Ops-scoped route (403)', async () => {
    const guard = guardWith('content@stignit.ng', AdminRole.CONTENT_MANAGER);
    await expect(guard.canActivate(ctx([AdminRole.OPERATIONS_MANAGER]))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('DENIES an identity with no admin account (fail closed, 403)', async () => {
    const guard = guardWith('stranger@stignit.ng', null);
    await expect(guard.canActivate(ctx([AdminRole.OPERATIONS_MANAGER]))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rejects a missing token (401)', async () => {
    const guard = guardWith('ops@stignit.ng', AdminRole.OPERATIONS_MANAGER);
    const c: any = ctx([AdminRole.OPERATIONS_MANAGER]);
    c.switchToHttp = () => ({ getRequest: () => ({ headers: {} }) });
    await expect(guard.canActivate(c)).rejects.toThrow(UnauthorizedException);
  });
});
