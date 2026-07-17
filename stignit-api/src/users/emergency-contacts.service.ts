import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, inArray } from 'drizzle-orm';
import { EncryptionService } from '../common/crypto/encryption.service';
import { normalizeNigerianPhone } from '../common/phone.util';
import { DRIZZLE, type Db } from '../database/drizzle.module';
import { AccountStatus, ActionType, IncidentStatus } from '../database/enums';
import {
  emergencyContacts,
  incidentActionLogs,
  incidents,
  users,
  type EmergencyContact,
} from '../database/schema';
import { first } from '../database/util';
import { NotificationService } from '../notification/notification.service';
import { EmergencyContactInput } from './dto/user.dto';

const OPT_OUT_KEYWORDS = ['STOP', 'OPT OUT', 'OPTOUT', 'UNSUBSCRIBE'];
const STATUS_KEYWORDS: Record<string, string> = {
  SAFE: 'SAFE',
  'CALL ME': 'CALL_ME',
  'NEED HELP': 'NEED_HELP',
};

@Injectable()
export class EmergencyContactsService {
  private readonly logger = new Logger(EmergencyContactsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly encryption: EncryptionService,
    private readonly notifications: NotificationService,
  ) {}

  async addContacts(userId: string, inputs: EmergencyContactInput[]): Promise<EmergencyContact[]> {
    const [{ existing }] = await this.db
      .select({ existing: count() })
      .from(emergencyContacts)
      .where(eq(emergencyContacts.userId, userId));
    if (Number(existing) + inputs.length > 4) {
      throw new BadRequestException('Maximum 4 emergency contacts');
    }
    const rows: EmergencyContact[] = [];
    for (const [i, input] of inputs.entries()) {
      const e164 = normalizeNigerianPhone(input.phone);
      const [row] = await this.db
        .insert(emergencyContacts)
        .values({
          userId,
          name: input.name,
          phoneNumber: e164,
          phoneHash: this.encryption.blindIndex(e164),
          relationship: input.relationship,
          priority: input.priority ?? Number(existing) + i + 1,
          verified: false,
        })
        .returning();
      rows.push(row);
      await this.notifications.enqueue({
        channel: 'sms',
        to: e164,
        body: `You were added as an emergency contact on Stignit. Reply STOP to opt out.`,
      });
    }
    return rows;
  }

  list(userId: string): Promise<EmergencyContact[]> {
    return this.db
      .select()
      .from(emergencyContacts)
      .where(eq(emergencyContacts.userId, userId))
      .orderBy(emergencyContacts.priority);
  }

  async remove(userId: string, contactId: string): Promise<void> {
    const deleted = await this.db
      .delete(emergencyContacts)
      .where(and(eq(emergencyContacts.id, contactId), eq(emergencyContacts.userId, userId)))
      .returning({ id: emergencyContacts.id });
    if (deleted.length === 0) throw new NotFoundException('Contact not found');
  }

  async countActive(userId: string): Promise<number> {
    const [{ c }] = await this.db
      .select({ c: count() })
      .from(emergencyContacts)
      .where(and(eq(emergencyContacts.userId, userId), eq(emergencyContacts.optedOut, false)));
    return Number(c);
  }

  /** Inbound SMS webhook handler (PRD 6.1.3). */
  async handleInboundSms(fromPhone: string, rawBody: string): Promise<{ handled: boolean }> {
    let e164: string;
    try {
      e164 = normalizeNigerianPhone(fromPhone);
    } catch {
      return { handled: false };
    }
    const phoneHash = this.encryption.blindIndex(e164);
    const matches = await this.db
      .select()
      .from(emergencyContacts)
      .where(eq(emergencyContacts.phoneHash, phoneHash));
    if (matches.length === 0) return { handled: false };

    const body = rawBody.trim().toUpperCase();

    if (OPT_OUT_KEYWORDS.some((k) => body === k || body.startsWith(k))) {
      const ids = matches.filter((c) => !c.optedOut).map((c) => c.id);
      if (ids.length) {
        await this.db
          .update(emergencyContacts)
          .set({ optedOut: true, optedOutAt: new Date() })
          .where(inArray(emergencyContacts.id, ids));
        this.logger.log(`${ids.length} contact(s) opted out`);
      }
      return { handled: true };
    }

    const statusKey = Object.keys(STATUS_KEYWORDS).find((k) => body.includes(k));
    if (statusKey) {
      for (const c of matches) {
        const active = first(
          await this.db
            .select({ incidentId: incidents.incidentId })
            .from(incidents)
            .where(
              and(
                eq(incidents.triggeringUserId, c.userId),
                inArray(incidents.status, [IncidentStatus.ACTIVE, IncidentStatus.UNDER_CONTROL]),
              ),
            )
            .orderBy(desc(incidents.createdAt))
            .limit(1),
        );
        if (active) {
          await this.db.insert(incidentActionLogs).values({
            incidentId: active.incidentId,
            actionType: ActionType.CONTACT_NOTIFIED,
            actionPayload: { source: 'inbound_sms', keyword: STATUS_KEYWORDS[statusKey] },
          });
        }
      }
      return { handled: true };
    }
    return { handled: true };
  }

  async flagIncompleteIfUnderMinimum(userId: string): Promise<void> {
    if ((await this.countActive(userId)) < 2) {
      await this.db.update(users).set({ accountStatus: AccountStatus.INCOMPLETE }).where(eq(users.id, userId));
    }
  }
}
