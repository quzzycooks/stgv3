import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MAINTENANCE_QUEUE } from '../messaging/queue.tokens';
import { ConsentService } from './consent.service';
import { EmergencyContactsService } from './emergency-contacts.service';
import { UsersMaintenanceProcessor } from './maintenance.processor';
import { MedicalAccessService } from './medical-access.service';
import { SkillVerificationService } from './skill-verification.service';
import { UsersController } from './users.controller';
import { UsersMaintenanceService } from './users-maintenance.service';
import { UsersService } from './users.service';
import { SmsWebhookController } from './webhooks.controller';

@Module({
  imports: [BullModule.registerQueue({ name: MAINTENANCE_QUEUE })],
  controllers: [UsersController, SmsWebhookController],
  providers: [
    UsersService,
    EmergencyContactsService,
    ConsentService,
    SkillVerificationService,
    MedicalAccessService,
    UsersMaintenanceService,
    UsersMaintenanceProcessor,
  ],
  exports: [
    UsersService,
    EmergencyContactsService,
    ConsentService,
    SkillVerificationService,
    MedicalAccessService,
  ],
})
export class UsersModule {}
