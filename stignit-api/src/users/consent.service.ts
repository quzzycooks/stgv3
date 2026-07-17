import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DRIZZLE, type Db } from '../database/drizzle.module';
import { ConsentCategory } from '../database/enums';
import { consentRecords } from '../database/schema';

const POLICY_VERSION = '2025-04';

/** Append-only consent ledger (NDPA §11.4). */
@Injectable()
export class ConsentService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async record(userId: string, category: ConsentCategory, granted: boolean): Promise<void> {
    await this.db
      .insert(consentRecords)
      .values({ userId, category, granted, policyVersion: POLICY_VERSION });
  }

  /** Current effective consent = latest record per category. */
  async current(userId: string): Promise<Record<string, boolean>> {
    const rows = await this.db
      .select()
      .from(consentRecords)
      .where(eq(consentRecords.userId, userId))
      .orderBy(desc(consentRecords.createdAt));
    const seen = new Set<string>();
    const out: Record<string, boolean> = {};
    for (const r of rows) {
      if (!seen.has(r.category)) {
        seen.add(r.category);
        out[r.category] = r.granted;
      }
    }
    return out;
  }

  hasConsent(current: Record<string, boolean>, category: ConsentCategory): boolean {
    return current[category] === true;
  }
}
