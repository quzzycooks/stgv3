import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { and, count, eq } from 'drizzle-orm';
import { DRIZZLE, type Db } from '../database/drizzle.module';
import { ActionType, DeliveryStatus, DispatchChannel } from '../database/enums';
import {
  incidentParticipants,
  incidents,
  institutionalContacts,
  institutionalDispatches,
  type InstitutionalDispatch,
} from '../database/schema';
import { first } from '../database/util';
import { ActionLogService } from '../incidents/action-log.service';
import { INSTITUTIONAL_QUEUE } from '../messaging/queue.tokens';
import { buildInstitutionalPacket } from './institutional-packet';

/**
 * Institutional notification (PRD 6.8). Builds the ANONYMIZED packet, creates a
 * per-recipient delivery record, and enqueues dispatch jobs.
 */
@Injectable()
export class InstitutionalService {
  private readonly logger = new Logger(InstitutionalService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly actionLog: ActionLogService,
    @InjectQueue(INSTITUTIONAL_QUEUE) private readonly queue: Queue,
  ) {}

  async dispatchForIncident(incidentId: string): Promise<{ dispatched: number }> {
    const incident = first(
      await this.db.select().from(incidents).where(eq(incidents.incidentId, incidentId)).limit(1),
    );
    if (!incident) return { dispatched: 0 };

    const [[{ confirmed }], [{ flagged }]] = await Promise.all([
      this.db
        .select({ confirmed: count() })
        .from(incidentParticipants)
        .where(and(eq(incidentParticipants.incidentId, incidentId), eq(incidentParticipants.proximityConfirmed, true))),
      this.db
        .select({ flagged: count() })
        .from(incidentParticipants)
        .where(and(eq(incidentParticipants.incidentId, incidentId), eq(incidentParticipants.proximityFlaggedSilent, true))),
    ]);

    const packet = buildInstitutionalPacket({
      incidentId: incident.incidentId,
      incidentType: incident.incidentType as any,
      gpsLat: parseFloat(incident.gpsLat),
      gpsLng: parseFloat(incident.gpsLng),
      gpsAccuracyMeters: incident.gpsAccuracyMeters,
      occurredAt: incident.occurredAt,
      confirmedUsersInRoom: Number(confirmed),
      nonRespondingUsersFlagged: Number(flagged),
      actionsTaken: [],
    });

    // Zone routing TODO (reverse-geocode gps → city_zone). MVP: all active contacts.
    const contacts = await this.db.select().from(institutionalContacts).where(eq(institutionalContacts.active, true));
    let dispatched = 0;
    for (const contact of contacts) {
      const channels: DispatchChannel[] = [];
      if (contact.phone) channels.push(DispatchChannel.SMS);
      if (contact.email) channels.push(DispatchChannel.EMAIL);
      for (const channel of channels) {
        const [record] = await this.db
          .insert(institutionalDispatches)
          .values({
            incidentId,
            contactId: contact.id,
            channel,
            status: DeliveryStatus.QUEUED,
            packet: packet as unknown as Record<string, unknown>,
          })
          .returning();
        await this.queue.add(
          'send',
          { dispatchId: record.id },
          { attempts: 3, backoff: { type: 'fixed', delay: 120_000 } },
        );
        dispatched++;
      }
    }

    await this.actionLog.log(incidentId, ActionType.INSTITUTIONAL_NOTIFIED, {
      recipients: contacts.length,
      dispatches: dispatched,
    });
    return { dispatched };
  }

  deliveryLog(incidentId: string): Promise<InstitutionalDispatch[]> {
    return this.db
      .select()
      .from(institutionalDispatches)
      .where(eq(institutionalDispatches.incidentId, incidentId))
      .orderBy(institutionalDispatches.createdAt);
  }

  flagged(): Promise<InstitutionalDispatch[]> {
    return this.db
      .select()
      .from(institutionalDispatches)
      .where(eq(institutionalDispatches.status, DeliveryStatus.FLAGGED));
  }
}
