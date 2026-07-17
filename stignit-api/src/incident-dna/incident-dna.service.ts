import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, count, eq, lt } from 'drizzle-orm';
import { DRIZZLE, type Db } from '../database/drizzle.module';
import { ActionType } from '../database/enums';
import { incidentActionLogs, incidentParticipants, incidents } from '../database/schema';
import { first } from '../database/util';
import { anonymizePayload, sessionToken } from './anonymization';

export interface IncidentDna {
  incidentId: string;
  incidentType: string;
  status: string;
  createdAt: Date;
  occurredAt: Date;
  closedAt: Date | null;
  responderAggregate: { participants: number; confirmed: number; silent: number };
  timeline: Array<{ at: Date; type: ActionType; payload: Record<string, unknown> }>;
}

/** Incident DNA (PRD 6.9): assembly, close-time anonymization, 24-month purge. */
@Injectable()
export class IncidentDnaService {
  private readonly logger = new Logger(IncidentDnaService.name);

  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async getDna(incidentId: string): Promise<IncidentDna> {
    const incident = first(
      await this.db.select().from(incidents).where(eq(incidents.incidentId, incidentId)).limit(1),
    );
    if (!incident) throw new NotFoundException('Incident not found');

    const [[{ participants }], [{ confirmed }], [{ silent }], logs] = await Promise.all([
      this.db.select({ participants: count() }).from(incidentParticipants).where(eq(incidentParticipants.incidentId, incidentId)),
      this.db
        .select({ confirmed: count() })
        .from(incidentParticipants)
        .where(and(eq(incidentParticipants.incidentId, incidentId), eq(incidentParticipants.proximityConfirmed, true))),
      this.db
        .select({ silent: count() })
        .from(incidentParticipants)
        .where(and(eq(incidentParticipants.incidentId, incidentId), eq(incidentParticipants.proximityFlaggedSilent, true))),
      this.db
        .select()
        .from(incidentActionLogs)
        .where(eq(incidentActionLogs.incidentId, incidentId))
        .orderBy(incidentActionLogs.timestamp),
    ]);

    return {
      incidentId: incident.incidentId,
      incidentType: incident.incidentType,
      status: incident.status,
      createdAt: incident.createdAt,
      occurredAt: incident.occurredAt,
      closedAt: incident.closedAt,
      responderAggregate: {
        participants: Number(participants),
        confirmed: Number(confirmed),
        silent: Number(silent),
      },
      timeline: logs.map((l) => ({ at: l.timestamp, type: l.actionType as ActionType, payload: l.actionPayload as Record<string, unknown> })),
    };
  }

  /** Anonymize at close (PRD 6.9.3). Idempotent. */
  async anonymizeIncident(incidentId: string): Promise<{ logsRewritten: number }> {
    const incident = first(
      await this.db.select().from(incidents).where(eq(incidents.incidentId, incidentId)).limit(1),
    );
    if (!incident || incident.anonymizedAt) return { logsRewritten: 0 };

    const logs = await this.db.select().from(incidentActionLogs).where(eq(incidentActionLogs.incidentId, incidentId));
    for (const log of logs) {
      const payload = (log.actionPayload ?? {}) as Record<string, unknown>;
      const scrubbed = anonymizePayload(incidentId, payload);
      const actor =
        typeof payload.userId === 'string' ? sessionToken(incidentId, payload.userId) : log.actorSessionToken;
      await this.db
        .update(incidentActionLogs)
        .set({ actionPayload: scrubbed, actorSessionToken: actor })
        .where(eq(incidentActionLogs.id, log.id));
    }

    // triggering_user_id is uuid; token is 32-hex → null the identity (token
    // lives only in the anonymized action log, the retained raw record).
    await this.db
      .update(incidents)
      .set({ triggeringUserId: null, anonymizedAt: new Date() })
      .where(eq(incidents.incidentId, incidentId));

    this.logger.log(`Anonymized incident ${incidentId} (${logs.length} logs)`);
    return { logsRewritten: logs.length };
  }

  /** Purge raw incident records older than 24 months (PRD 6.9.3). */
  async purgeExpired(now = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - 24 * 30 * 86400_000);
    const deleted = await this.db.delete(incidents).where(lt(incidents.closedAt, cutoff)).returning({ id: incidents.incidentId });
    return deleted.length;
  }
}
