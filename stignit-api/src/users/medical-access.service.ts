import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE, type Db } from '../database/drizzle.module';
import { AccessLevel, ActionType, IncidentStatus } from '../database/enums';
import { incidentActionLogs, incidentParticipants, incidents, users } from '../database/schema';
import { first } from '../database/util';

/**
 * Time-boxed, incident-scoped access to a victim's medical info (PRD 6.1.2 /
 * 11.3). NOT a standing permission — every read re-checks: (a) verified Skilled
 * Responder, (b) incident still OPEN (closes → access revoked), (c) both are
 * participants. Every read is audited.
 */
@Injectable()
export class MedicalAccessService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  private readonly OPEN = [IncidentStatus.ACTIVE, IncidentStatus.UNDER_CONTROL];

  async getMedicalInfo(
    requesterId: string,
    targetUserId: string,
    incidentId: string,
  ): Promise<Record<string, unknown> | null> {
    const requester = first(
      await this.db
        .select({ accessLevel: users.accessLevel, skillVerified: users.skillVerified })
        .from(users)
        .where(eq(users.id, requesterId))
        .limit(1),
    );
    if (!requester) throw new NotFoundException('Requester not found');
    if (requester.accessLevel !== AccessLevel.SKILLED || !requester.skillVerified) {
      throw new ForbiddenException('Medical info restricted to verified Skilled Responders');
    }

    const incident = first(
      await this.db
        .select({ status: incidents.status, triggeringUserId: incidents.triggeringUserId })
        .from(incidents)
        .where(eq(incidents.incidentId, incidentId))
        .limit(1),
    );
    if (!incident) throw new NotFoundException('Incident not found');
    if (!this.OPEN.includes(incident.status as IncidentStatus)) {
      throw new ForbiddenException('Medical access revoked — incident is not active');
    }

    const membership = first(
      await this.db
        .select({ id: incidentParticipants.id })
        .from(incidentParticipants)
        .where(and(eq(incidentParticipants.incidentId, incidentId), eq(incidentParticipants.userId, requesterId)))
        .limit(1),
    );
    if (!membership) throw new ForbiddenException('Not a participant in this incident');

    const targetParticipant =
      incident.triggeringUserId === targetUserId
        ? true
        : first(
            await this.db
              .select({ id: incidentParticipants.id })
              .from(incidentParticipants)
              .where(and(eq(incidentParticipants.incidentId, incidentId), eq(incidentParticipants.userId, targetUserId)))
              .limit(1),
          ) != null;
    if (!targetParticipant) throw new ForbiddenException('Target is not part of this incident');

    await this.db.insert(incidentActionLogs).values({
      incidentId,
      actionType: ActionType.STATUS_CHANGE,
      actionPayload: { kind: 'MEDICAL_ACCESS', requesterId, targetUserId },
    });

    const target = first(
      await this.db.select({ medicalInfo: users.medicalInfo }).from(users).where(eq(users.id, targetUserId)).limit(1),
    );
    return target?.medicalInfo ?? null;
  }
}
