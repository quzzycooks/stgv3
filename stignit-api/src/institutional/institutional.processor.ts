import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type Db } from '../database/drizzle.module';
import { DeliveryStatus, DispatchChannel } from '../database/enums';
import { institutionalContacts, institutionalDispatches } from '../database/schema';
import { first } from '../database/util';
import { INSTITUTIONAL_QUEUE } from '../messaging/queue.tokens';
import { EmailService } from './email.service';
import { SmsService } from '../notification/sms.service';
import { InstitutionalPacket, renderPacketSms } from './institutional-packet';

/**
 * Sends institutional dispatches with retry (3× at 2-min intervals). On the
 * final failed attempt the record is FLAGGED for manual admin follow-up (6.8.3).
 */
@Processor(INSTITUTIONAL_QUEUE, { concurrency: 10 })
export class InstitutionalProcessor extends WorkerHost {
  private readonly logger = new Logger(InstitutionalProcessor.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly sms: SmsService,
    private readonly email: EmailService,
  ) {
    super();
  }

  async process(job: Job<{ dispatchId: string }>): Promise<void> {
    const dispatch = first(
      await this.db.select().from(institutionalDispatches).where(eq(institutionalDispatches.id, job.data.dispatchId)).limit(1),
    );
    if (!dispatch || dispatch.status === DeliveryStatus.SENT) return;

    const contact = first(
      await this.db.select().from(institutionalContacts).where(eq(institutionalContacts.id, dispatch.contactId)).limit(1),
    );
    const packet = dispatch.packet as unknown as InstitutionalPacket;

    try {
      if (dispatch.channel === DispatchChannel.SMS && contact?.phone) {
        await this.sms.send(contact.phone, renderPacketSms(packet));
      } else if (dispatch.channel === DispatchChannel.EMAIL && contact?.email) {
        await this.email.send(contact.email, `Stignit incident ${packet.incidentId}`, JSON.stringify(packet, null, 2));
      } else {
        throw new Error('Contact missing channel address');
      }
      await this.db
        .update(institutionalDispatches)
        .set({ status: DeliveryStatus.SENT, attempts: dispatch.attempts + 1, lastError: null, updatedAt: new Date() })
        .where(eq(institutionalDispatches.id, dispatch.id));
    } catch (err) {
      const isFinal = (job.attemptsMade ?? 0) + 1 >= (job.opts.attempts ?? 3);
      await this.db
        .update(institutionalDispatches)
        .set({
          status: isFinal ? DeliveryStatus.FLAGGED : DeliveryStatus.FAILED,
          attempts: dispatch.attempts + 1,
          lastError: (err as Error).message,
          updatedAt: new Date(),
        })
        .where(eq(institutionalDispatches.id, dispatch.id));
      if (!isFinal) throw err;
      this.logger.error(`Institutional dispatch ${dispatch.id} FLAGGED for manual follow-up`);
    }
  }
}
