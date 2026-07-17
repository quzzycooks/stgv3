import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { count, desc, eq, inArray } from 'drizzle-orm';
import { DRIZZLE, type Db } from '../database/drizzle.module';
import { AccessLevel, AccountStatus, IncidentStatus } from '../database/enums';
import { drivers, incidents, institutionalContacts, users, type Driver, type InstitutionalContact } from '../database/schema';
import { IncidentDnaService } from '../incident-dna/incident-dna.service';
import { RiskZoneService } from '../incident-dna/risk-zone.service';
import { InstitutionalService } from '../institutional/institutional.service';
import { SkillVerificationService } from '../users/skill-verification.service';

/** Operational back-office logic for the admin dashboard (PRD 6.12). */
@Injectable()
export class AdminService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly dna: IncidentDnaService,
    private readonly riskZones: RiskZoneService,
    private readonly institutional: InstitutionalService,
    private readonly skills: SkillVerificationService,
  ) {}

  // --- Incidents ---
  listIncidents(status?: IncidentStatus) {
    return this.db
      .select()
      .from(incidents)
      .where(status ? eq(incidents.status, status) : undefined)
      .orderBy(desc(incidents.createdAt))
      .limit(200);
  }
  incidentDetail(incidentId: string) {
    return this.dna.getDna(incidentId);
  }

  // --- Users ---
  listUsers() {
    return this.db
      .select({
        id: users.id,
        accessLevel: users.accessLevel,
        accountStatus: users.accountStatus,
        skillVerified: users.skillVerified,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(200);
  }
  async setUserStatus(userId: string, status: AccountStatus) {
    const updated = await this.db.update(users).set({ accountStatus: status }).where(eq(users.id, userId)).returning({ id: users.id });
    if (updated.length === 0) throw new NotFoundException('User not found');
  }
  verificationQueue() {
    return this.skills.pendingQueue();
  }
  reviewSkill(verificationId: string, adminId: string, approve: boolean, notes?: string) {
    return this.skills.review(verificationId, adminId, approve, notes);
  }

  // --- Drivers ---
  listDrivers() {
    return this.db.select().from(drivers).limit(200);
  }
  async createDriver(data: Partial<Driver>) {
    const [d] = await this.db.insert(drivers).values(data as any).returning();
    return d;
  }
  async setDriverVerification(driverId: string, gates: Partial<Driver>) {
    const updated = await this.db.update(drivers).set(gates).where(eq(drivers.id, driverId)).returning({ id: drivers.id });
    if (updated.length === 0) throw new NotFoundException('Driver not found');
  }

  // --- Institutional ---
  async addContact(data: Partial<InstitutionalContact>) {
    const [c] = await this.db.insert(institutionalContacts).values(data as any).returning();
    return c;
  }
  deliveryLog(incidentId: string) {
    return this.institutional.deliveryLog(incidentId);
  }
  flaggedDispatches() {
    return this.institutional.flagged();
  }

  // --- Risk intelligence ---
  recomputeRiskZones() {
    return this.riskZones.recompute();
  }

  // --- Analytics / KPIs (PRD §15) ---
  async kpis() {
    const [[{ total }], [{ active }], [{ falseAlarms }], [{ userCount }], [{ tier1plus }], [{ driverCount }]] =
      await Promise.all([
        this.db.select({ total: count() }).from(incidents),
        this.db.select({ active: count() }).from(incidents).where(eq(incidents.status, IncidentStatus.ACTIVE)),
        this.db.select({ falseAlarms: count() }).from(incidents).where(eq(incidents.status, IncidentStatus.FALSE_ALARM)),
        this.db.select({ userCount: count() }).from(users),
        this.db
          .select({ tier1plus: count() })
          .from(users)
          .where(inArray(users.accessLevel, [AccessLevel.TIER1, AccessLevel.TIER2, AccessLevel.SKILLED])),
        this.db.select({ driverCount: count() }).from(drivers),
      ]);
    const t = Number(total);
    return {
      totalIncidents: t,
      activeIncidents: Number(active),
      falseAlarmRate: t ? Math.round((Number(falseAlarms) / t) * 100) : 0,
      users: Number(userCount),
      tier1plus: Number(tier1plus),
      drivers: Number(driverCount),
    };
  }
}
