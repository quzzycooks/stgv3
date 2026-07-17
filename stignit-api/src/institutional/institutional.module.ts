import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { IncidentsModule } from '../incidents/incidents.module';
import { INSTITUTIONAL_QUEUE } from '../messaging/queue.tokens';
import { EmailService } from './email.service';
import { InstitutionalProcessor } from './institutional.processor';
import { InstitutionalService } from './institutional.service';
import { InstitutionalSubscriber } from './institutional.subscriber';

@Module({
  imports: [BullModule.registerQueue({ name: INSTITUTIONAL_QUEUE }), IncidentsModule],
  providers: [InstitutionalService, InstitutionalProcessor, InstitutionalSubscriber, EmailService],
  exports: [InstitutionalService],
})
export class InstitutionalModule {}
