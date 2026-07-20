import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { NOTIFICATION_QUEUE } from '../messaging/queue.tokens';
import { NotificationProcessor } from './notification.processor';
import { NotificationService } from './notification.service';
import { OtpDevService } from './otp-dev.service';
import { PushService } from './push.service';
import { SmsService } from './sms.service';

@Global()
@Module({
  imports: [BullModule.registerQueue({ name: NOTIFICATION_QUEUE })],
  providers: [NotificationService, NotificationProcessor, SmsService, OtpDevService, PushService],
  exports: [NotificationService, SmsService, OtpDevService, PushService],
})
export class NotificationModule {}
