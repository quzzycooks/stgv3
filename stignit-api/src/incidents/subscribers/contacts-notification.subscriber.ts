import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE, type Db } from '../../database/drizzle.module';
import { ActionType } from '../../database/enums';
import { emergencyContacts } from '../../database/schema';
import { EventBus } from '../../messaging/event-bus.service';
import { EventType, SituationRoomCreatedEvent } from '../../messaging/events';
import { NotificationService } from '../../notification/notification.service';
import { ActionLogService } from '../action-log.service';

/**
 * Fan-out subscriber #1 (PRD 8.2 step 22): notify the triggering user's
 * emergency contacts on Situation Room creation. Opted-out contacts skipped.
 */
@Injectable()
export class ContactsNotificationSubscriber implements OnModuleInit {
  constructor(
    private readonly bus: EventBus,
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly notifications: NotificationService,
    private readonly actionLog: ActionLogService,
  ) {}

  onModuleInit(): void {
    this.bus.subscribe(EventType.SITUATION_ROOM_CREATED, 'contacts-notification', (e) =>
      this.handle(e as SituationRoomCreatedEvent),
    );
  }

  private async handle(event: SituationRoomCreatedEvent): Promise<void> {
    if (!event.triggeringUserId) return;
    const contacts = await this.db
      .select()
      .from(emergencyContacts)
      .where(and(eq(emergencyContacts.userId, event.triggeringUserId), eq(emergencyContacts.optedOut, false)))
      .orderBy(emergencyContacts.priority);
    const body = `Stignit alert: someone you're an emergency contact for may need help. Location: https://maps.google.com/?q=${event.gps.lat},${event.gps.lng}`;

    await this.notifications.enqueueMany(
      contacts.map((c) => ({ channel: 'sms' as const, to: c.phoneNumber, body })),
    );
    await this.actionLog.log(event.incidentId, ActionType.CONTACT_NOTIFIED, { count: contacts.length });
  }
}
