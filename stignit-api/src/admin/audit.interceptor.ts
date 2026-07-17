import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AdminIdentity } from '../admin-auth/admin-identity';
import { AuditService } from './audit.service';

/**
 * Logs every admin action after it succeeds (PRD 6.12.3). Runs after the
 * AdminAuthGuard has attached req.admin. Mutations (non-GET) are always
 * recorded; GETs are skipped to avoid noise but could be enabled for read-audit.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest();
    const admin: AdminIdentity | undefined = req.admin;
    const method: string = req.method;

    return next.handle().pipe(
      tap(() => {
        if (!admin || method === 'GET') return;
        void this.audit.record(
          admin,
          `${ctx.getClass().name}.${ctx.getHandler().name}`,
          method,
          req.originalUrl ?? req.url,
          { params: req.params, body: this.redact(req.body) },
        );
      }),
    );
  }

  /** Never store raw PII/credentials in the audit log. */
  private redact(body: Record<string, unknown> = {}): Record<string, unknown> {
    const clone = { ...body };
    for (const k of ['documentUrl', 'phone', 'phoneNumber', 'fullName', 'medicalInfo']) {
      if (k in clone) clone[k] = '[redacted]';
    }
    return clone;
  }
}
