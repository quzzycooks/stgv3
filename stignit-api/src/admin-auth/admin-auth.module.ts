import { Global, Module } from '@nestjs/common';
import { ADMIN_ID_TOKEN_VERIFIER, ADMIN_REGISTRY } from './admin-identity';
import { AdminAuthGuard } from './admin-auth.guard';
import { DbAdminRegistry } from './db-admin-registry';
import { GoogleIdTokenVerifier } from './google-id-token.verifier';

/**
 * Admin dashboard auth — separate from mobile (PRD 11.2). SSO ID-token
 * verification + DB-backed role registry (fail-closed: unknown email → 403).
 */
@Global()
@Module({
  providers: [
    AdminAuthGuard,
    { provide: ADMIN_ID_TOKEN_VERIFIER, useClass: GoogleIdTokenVerifier },
    { provide: ADMIN_REGISTRY, useClass: DbAdminRegistry },
  ],
  exports: [AdminAuthGuard, ADMIN_ID_TOKEN_VERIFIER, ADMIN_REGISTRY],
})
export class AdminAuthModule {}
