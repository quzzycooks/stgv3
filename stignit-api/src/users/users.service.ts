import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type Db } from '../database/drizzle.module';
import { AccountStatus } from '../database/enums';
import { users } from '../database/schema';
import { first } from '../database/util';
import { ConsentService } from './consent.service';
import { EmergencyContactsService } from './emergency-contacts.service';
import { RegisterDto, UpdateProfileDto } from './dto/user.dto';

function ageFrom(iso: string): number {
  const dob = new Date(iso);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

@Injectable()
export class UsersService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly contactsService: EmergencyContactsService,
    private readonly consent: ConsentService,
  ) {}

  /** Completes the profile for a phone-verified (INCOMPLETE) account (PRD 6.1.1). */
  async register(userId: string, dto: RegisterDto): Promise<{ id: string; accessLevel: string }> {
    const user = first(await this.db.select().from(users).where(eq(users.id, userId)).limit(1));
    if (!user) throw new NotFoundException('User not found');
    if (user.accountStatus === AccountStatus.DELETED) throw new BadRequestException('Account deleted');
    if (ageFrom(dto.dateOfBirth) < 16) {
      throw new BadRequestException('Platform is restricted to users aged 16+');
    }

    await this.db
      .update(users)
      .set({
        fullName: dto.fullName,
        dateOfBirth: dto.dateOfBirth,
        stateLga: dto.stateLga,
        profilePhotoUrl: dto.profilePhotoUrl ?? null,
        medicalInfo: (dto.medicalInfo ?? null) as Record<string, unknown> | null,
        accountStatus: AccountStatus.ACTIVE,
      })
      .where(eq(users.id, userId));

    await this.contactsService.addContacts(userId, dto.emergencyContacts);
    for (const c of dto.consents ?? []) await this.consent.record(userId, c.category, c.granted);
    return { id: user.id, accessLevel: user.accessLevel };
  }

  async getMe(userId: string): Promise<Record<string, unknown>> {
    const user = first(await this.db.select().from(users).where(eq(users.id, userId)).limit(1));
    if (!user) throw new NotFoundException();
    const contacts = await this.contactsService.list(userId);
    return {
      id: user.id,
      phoneNumber: user.phoneNumber,
      fullName: user.fullName,
      dateOfBirth: user.dateOfBirth,
      stateLga: user.stateLga,
      profilePhotoUrl: user.profilePhotoUrl,
      accessLevel: user.accessLevel,
      drillCompletionPct: user.drillCompletionPct,
      welfareCheckDelaySec: user.welfareCheckDelaySec,
      professionalSkill: user.professionalSkill,
      skillVerified: user.skillVerified,
      accountStatus: user.accountStatus,
      medicalInfo: user.medicalInfo, // self may view own medical info
      emergencyContacts: contacts.map((c) => ({
        id: c.id,
        name: c.name,
        phoneNumber: c.phoneNumber,
        relationship: c.relationship,
        priority: c.priority,
        verified: c.verified,
        optedOut: c.optedOut,
      })),
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<void> {
    const patch: Record<string, unknown> = {};
    if (dto.fullName !== undefined) patch.fullName = dto.fullName;
    if (dto.stateLga !== undefined) patch.stateLga = dto.stateLga;
    if (dto.profilePhotoUrl !== undefined) patch.profilePhotoUrl = dto.profilePhotoUrl;
    if (dto.welfareCheckDelaySec !== undefined) patch.welfareCheckDelaySec = dto.welfareCheckDelaySec;
    if (dto.medicalInfo !== undefined) patch.medicalInfo = dto.medicalInfo;
    if (Object.keys(patch).length === 0) return;
    const updated = await this.db.update(users).set(patch).where(eq(users.id, userId)).returning({ id: users.id });
    if (updated.length === 0) throw new NotFoundException();
  }

  /** NDPA deletion request — schedules hard PII delete within 30 days (6.1.2). */
  async requestDeletion(userId: string): Promise<{ scheduledFor: string }> {
    const requestedAt = new Date();
    await this.db
      .update(users)
      .set({ deletionRequestedAt: requestedAt, accountStatus: AccountStatus.SUSPENDED })
      .where(eq(users.id, userId));
    return { scheduledFor: new Date(requestedAt.getTime() + 30 * 86400_000).toISOString() };
  }

  /** NDPA self-service data export (PRD 11.4). */
  async exportData(userId: string): Promise<Record<string, unknown>> {
    return {
      exportedAt: new Date().toISOString(),
      profile: await this.getMe(userId),
      consents: await this.consent.current(userId),
    };
  }
}
