import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DRIZZLE, type Db } from '../database/drizzle.module';
import { auditLogs, type AuditLog } from '../database/schema';
import { AdminIdentity } from '../admin-auth/admin-identity';

/** Writes the immutable admin audit trail (PRD 6.12.3 / NDPA). */
@Injectable()
export class AuditService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async record(
    admin: AdminIdentity,
    action: string,
    method: string,
    path: string,
    params: Record<string, unknown>,
  ): Promise<void> {
    await this.db.insert(auditLogs).values({
      adminId: admin.adminId,
      adminEmail: admin.email,
      action,
      method,
      path,
      params,
    });
  }

  list(adminId?: string): Promise<AuditLog[]> {
    return this.db
      .select()
      .from(auditLogs)
      .where(adminId ? eq(auditLogs.adminId, adminId) : undefined)
      .orderBy(desc(auditLogs.createdAt))
      .limit(500);
  }
}
