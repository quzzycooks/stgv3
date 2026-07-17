import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE, type Db } from '../database/drizzle.module';
import { admins } from '../database/schema';
import { first } from '../database/util';
import { AdminIdentity, AdminRegistry, AdminRole } from './admin-identity';

/** Resolves a verified SSO email to an active admin account (PRD 6.12.3). */
@Injectable()
export class DbAdminRegistry implements AdminRegistry {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async findByEmail(email: string): Promise<AdminIdentity | null> {
    const admin = first(
      await this.db
        .select()
        .from(admins)
        .where(and(eq(admins.email, email.toLowerCase()), eq(admins.active, true)))
        .limit(1),
    );
    if (!admin) return null;
    return { adminId: admin.id, email: admin.email, role: admin.role as AdminRole };
  }
}
