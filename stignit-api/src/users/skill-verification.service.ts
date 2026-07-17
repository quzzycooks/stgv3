import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { DRIZZLE, type Db } from '../database/drizzle.module';
import { AccessLevel, ProfessionalSkill, SkillVerificationStatus } from '../database/enums';
import { skillVerifications, users, type SkillVerification } from '../database/schema';
import { first } from '../database/util';

const SLA_HOURS = 72;

/** PRD 6.1.1 skill-verification workflow + admin review queue. */
@Injectable()
export class SkillVerificationService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async submit(userId: string, skill: ProfessionalSkill, documentUrl: string): Promise<SkillVerification> {
    const slaDueAt = new Date(Date.now() + SLA_HOURS * 3600_000);
    const [row] = await this.db
      .insert(skillVerifications)
      .values({ userId, skill, documentUrl, status: SkillVerificationStatus.PENDING, slaDueAt })
      .returning();
    await this.db
      .update(users)
      .set({
        professionalSkill: skill,
        skillVerificationStatus: SkillVerificationStatus.PENDING,
        skillVerified: false,
      })
      .where(eq(users.id, userId));
    return row;
  }

  pendingQueue(): Promise<SkillVerification[]> {
    return this.db
      .select()
      .from(skillVerifications)
      .where(eq(skillVerifications.status, SkillVerificationStatus.PENDING))
      .orderBy(asc(skillVerifications.slaDueAt));
  }

  async review(
    verificationId: string,
    reviewerAdminId: string,
    approve: boolean,
    notes?: string,
  ): Promise<SkillVerification> {
    const row = first(
      await this.db.select().from(skillVerifications).where(eq(skillVerifications.id, verificationId)).limit(1),
    );
    if (!row) throw new NotFoundException('Verification not found');

    const status = approve ? SkillVerificationStatus.APPROVED : SkillVerificationStatus.REJECTED;
    const [updated] = await this.db
      .update(skillVerifications)
      .set({ status, reviewerAdminId, reviewNotes: notes ?? null, reviewedAt: new Date() })
      .where(eq(skillVerifications.id, verificationId))
      .returning();

    if (approve) {
      const user = first(await this.db.select().from(users).where(eq(users.id, row.userId)).limit(1));
      if (user) {
        const eligibleForSkilled =
          user.accessLevel === AccessLevel.TIER1 || user.accessLevel === AccessLevel.TIER2;
        await this.db
          .update(users)
          .set({
            skillVerified: true,
            skillVerificationStatus: SkillVerificationStatus.APPROVED,
            accessLevel: eligibleForSkilled ? AccessLevel.SKILLED : user.accessLevel,
          })
          .where(eq(users.id, row.userId));
      }
    } else {
      await this.db
        .update(users)
        .set({ skillVerified: false, skillVerificationStatus: SkillVerificationStatus.REJECTED })
        .where(eq(users.id, row.userId));
    }
    return updated;
  }
}
