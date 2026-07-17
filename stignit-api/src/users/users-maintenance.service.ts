import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, count, eq, isNull, lt, ne } from 'drizzle-orm';
import { DRIZZLE, type Db } from '../database/drizzle.module';
import { AccountStatus } from '../database/enums';
import { emergencyContacts, incidents, users } from '../database/schema';

/**
 * NDPA retention jobs: hard-delete PII 30 days after a deletion request (6.1.2),
 * anonymizing incident references; downgrade accounts below the 2-contact minimum.
 */
@Injectable()
export class UsersMaintenanceService {
  private readonly logger = new Logger(UsersMaintenanceService.name);

  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async purgeDueDeletions(now = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - 30 * 86400_000);
    const due = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(lt(users.deletionRequestedAt, cutoff), ne(users.accountStatus, AccountStatus.DELETED)));

    for (const { id } of due) {
      await this.db.update(incidents).set({ triggeringUserId: null }).where(eq(incidents.triggeringUserId, id));
      await this.db.delete(emergencyContacts).where(eq(emergencyContacts.userId, id));
      await this.db
        .update(users)
        .set({
          phoneNumber: 'DELETED',
          phoneHash: `deleted-${id}`.slice(0, 64).padEnd(64, '0'),
          fullName: 'DELETED',
          dateOfBirth: 'DELETED',
          stateLga: null,
          profilePhotoUrl: null,
          medicalInfo: null,
          professionalSkill: null,
          accountStatus: AccountStatus.DELETED,
          deletionRequestedAt: null,
        })
        .where(eq(users.id, id));
      this.logger.log(`Purged PII for user ${id}`);
    }
    return due.length;
  }

  async downgradeUnderMinimumContacts(): Promise<number> {
    const active = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.accountStatus, AccountStatus.ACTIVE), isNull(users.deletionRequestedAt)));
    let flagged = 0;
    for (const { id } of active) {
      const [{ c }] = await this.db
        .select({ c: count() })
        .from(emergencyContacts)
        .where(and(eq(emergencyContacts.userId, id), eq(emergencyContacts.optedOut, false)));
      if (Number(c) < 2) {
        await this.db.update(users).set({ accountStatus: AccountStatus.INCOMPLETE }).where(eq(users.id, id));
        flagged++;
      }
    }
    return flagged;
  }
}
