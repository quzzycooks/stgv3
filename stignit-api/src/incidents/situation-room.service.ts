import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { and, eq, sql } from 'drizzle-orm';
import { DRIZZLE, type Db } from '../database/drizzle.module';
import { ActionType, IncidentStatus, IncidentType, TriggerType } from '../database/enums';
import { incidentParticipants, incidents, type Incident, type IncidentParticipant } from '../database/schema';
import { first } from '../database/util';
import { EventBus } from '../messaging/event-bus.service';
import { EventType } from '../messaging/events';
import { INCIDENT_TIMER_QUEUE } from '../messaging/queue.tokens';
import { NotificationService } from '../notification/notification.service';
import { ActionLogService } from './action-log.service';
import { TERMINAL_STATES, assertTransition } from './incident-lifecycle';
import { generateIncidentId } from './incident-id.util';
import { ProximityService } from './proximity.service';

export interface CreateSituationRoomInput {
  triggerType: TriggerType;
  incidentType: IncidentType;
  triggeringUserId: string | null;
  gps: { lat: number; lng: number; accuracyMeters?: number };
  occurredAt: Date;
  observerMode: boolean;
  syncedAt?: Date | null;
}

const PROXIMITY_SILENT_MS = 90_000;

/**
 * Single creation service for all 3 Situation Room entry paths (PRD 6.5.2).
 * Emits SITUATION_ROOM_CREATED for the failure-isolated fan-out (§8.2). Owns
 * proximity computation and the lifecycle state machine.
 */
@Injectable()
export class SituationRoomService {
  private readonly logger = new Logger(SituationRoomService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly actionLog: ActionLogService,
    private readonly proximity: ProximityService,
    private readonly events: EventBus,
    private readonly notifications: NotificationService,
    @InjectQueue(INCIDENT_TIMER_QUEUE) private readonly timers: Queue,
  ) {}

  async create(input: CreateSituationRoomInput): Promise<Incident> {
    const incident = await this.insertWithUniqueId(input);

    if (input.triggeringUserId) {
      await this.db
        .insert(incidentParticipants)
        .values({ incidentId: incident.incidentId, userId: input.triggeringUserId, proximityConfirmed: true });
    }
    await this.actionLog.log(incident.incidentId, ActionType.INCIDENT_CREATED, {
      triggerType: input.triggerType,
      incidentType: input.incidentType,
      observerMode: input.observerMode,
    });

    await this.events.publish({
      type: EventType.SITUATION_ROOM_CREATED,
      incidentId: incident.incidentId,
      incidentType: incident.incidentType as IncidentType,
      triggeringUserId: input.triggeringUserId,
      gps: input.gps,
      occurredAt: input.occurredAt.toISOString(),
      observerMode: input.observerMode,
    });

    await this.runProximity(incident, input.triggeringUserId ?? undefined);
    return incident;
  }

  private async insertWithUniqueId(input: CreateSituationRoomInput): Promise<Incident> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const incidentId = generateIncidentId();
      try {
        await this.db.execute(sql`
          INSERT INTO incidents
            (incident_id, triggering_user_id, trigger_type, incident_type, status,
             gps_lat, gps_lng, gps_accuracy_meters, geom, occurred_at, synced_at, created_at)
          VALUES (${incidentId}, ${input.triggeringUserId}, ${input.triggerType}, ${input.incidentType}, 'ACTIVE',
             ${input.gps.lat}, ${input.gps.lng}, ${input.gps.accuracyMeters ?? null},
             ST_SetSRID(ST_MakePoint(${input.gps.lng}, ${input.gps.lat}),4326)::geography,
             ${input.occurredAt}, ${input.syncedAt ?? null}, now())
        `);
        return first(await this.db.select().from(incidents).where(eq(incidents.incidentId, incidentId)).limit(1))!;
      } catch (err: any) {
        if (err?.code === '23505') {
          this.logger.warn(`Incident ID collision on ${incidentId}, retrying`);
          continue;
        }
        throw err;
      }
    }
    throw new Error('Could not allocate a unique Incident ID after 5 attempts');
  }

  private async runProximity(incident: Incident, excludeUserId?: string): Promise<void> {
    const { users, radiusMeters } = await this.proximity.findNearby(
      parseFloat(incident.gpsLat),
      parseFloat(incident.gpsLng),
      excludeUserId,
    );
    await this.actionLog.log(incident.incidentId, ActionType.PROXIMITY_ALERT, {
      count: users.length,
      radiusMeters,
    });

    for (const u of users) {
      await this.db
        .insert(incidentParticipants)
        .values({ incidentId: incident.incidentId, userId: u.userId, proximityConfirmed: null })
        .onConflictDoNothing();
      await this.notifications.enqueue({
        channel: 'push',
        target: `user:${u.userId}`,
        title: 'Emergency nearby',
        body: 'A user near your location may need assistance — please be observant.',
      });
      await this.timers.add(
        'proximity-silent',
        { incidentId: incident.incidentId, userId: u.userId },
        { delay: PROXIMITY_SILENT_MS, jobId: `sil:${incident.incidentId}:${u.userId}` },
      );
    }
  }

  async confirmProximity(incidentId: string, userId: string, present: boolean): Promise<void> {
    const updated = await this.db
      .update(incidentParticipants)
      .set({ proximityConfirmed: present })
      .where(and(eq(incidentParticipants.incidentId, incidentId), eq(incidentParticipants.userId, userId)))
      .returning({ id: incidentParticipants.id });
    if (updated.length === 0) throw new NotFoundException('Not part of this incident');
    await this.timers.remove(`sil:${incidentId}:${userId}`).catch(() => undefined);
    await this.actionLog.log(incidentId, ActionType.PROXIMITY_CONFIRMED, { userId, present });
  }

  async flagSilentIfUnconfirmed(incidentId: string, userId: string): Promise<void> {
    const participant = first(
      await this.db
        .select()
        .from(incidentParticipants)
        .where(and(eq(incidentParticipants.incidentId, incidentId), eq(incidentParticipants.userId, userId)))
        .limit(1),
    );
    if (participant && participant.proximityConfirmed === null) {
      await this.db
        .update(incidentParticipants)
        .set({ proximityFlaggedSilent: true })
        .where(eq(incidentParticipants.id, participant.id));
      await this.actionLog.log(incidentId, ActionType.PROXIMITY_CONFIRMED, { userId, silent: true });
    }
  }

  async transition(
    incidentId: string,
    to: IncidentStatus,
    meta: Record<string, unknown> = {},
  ): Promise<Incident> {
    const incident = first(await this.db.select().from(incidents).where(eq(incidents.incidentId, incidentId)).limit(1));
    if (!incident) throw new NotFoundException('Incident not found');
    assertTransition(incident.status as IncidentStatus, to);

    const from = incident.status as IncidentStatus;
    const patch: Record<string, unknown> = { status: to };
    if (TERMINAL_STATES.includes(to)) patch.closedAt = new Date();
    if (to === IncidentStatus.FALSE_ALARM && typeof meta.reason === 'string') patch.falseAlarmReason = meta.reason;
    const [updated] = await this.db.update(incidents).set(patch).where(eq(incidents.incidentId, incidentId)).returning();

    await this.actionLog.log(incidentId, ActionType.STATUS_CHANGE, { from, to, ...meta });
    await this.events.publish({ type: EventType.SITUATION_ROOM_STATUS_CHANGED, incidentId, from, to });
    if (TERMINAL_STATES.includes(to)) {
      await this.events.publish({ type: EventType.INCIDENT_CLOSED, incidentId, finalStatus: to });
    }
    return updated;
  }

  findById(incidentId: string): Promise<Incident | null> {
    return this.db
      .select()
      .from(incidents)
      .where(eq(incidents.incidentId, incidentId))
      .limit(1)
      .then(first);
  }

  getParticipant(incidentId: string, userId: string): Promise<IncidentParticipant | null> {
    return this.db
      .select()
      .from(incidentParticipants)
      .where(and(eq(incidentParticipants.incidentId, incidentId), eq(incidentParticipants.userId, userId)))
      .limit(1)
      .then(first);
  }
}
