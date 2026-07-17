import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { INCIDENT_TIMER_QUEUE } from '../messaging/queue.tokens';
import { ActionLogService } from './action-log.service';
import { IncidentAccessGuard } from './incident-access.guard';
import { IncidentTimerProcessor } from './incident-timer.processor';
import { ProximityService } from './proximity.service';
import { SituationRoomController } from './situation-room.controller';
import { SituationRoomGateway } from './situation-room.gateway';
import { SituationRoomService } from './situation-room.service';
import { ContactsNotificationSubscriber } from './subscribers/contacts-notification.subscriber';

/** Situation Room domain (PRD 6.5) — critical path. */
@Module({
  imports: [BullModule.registerQueue({ name: INCIDENT_TIMER_QUEUE }), JwtModule.register({})],
  controllers: [SituationRoomController],
  providers: [
    SituationRoomService,
    ProximityService,
    ActionLogService,
    IncidentAccessGuard,
    IncidentTimerProcessor,
    SituationRoomGateway,
    ContactsNotificationSubscriber,
  ],
  exports: [
    SituationRoomService,
    ProximityService,
    ActionLogService,
    IncidentAccessGuard,
    SituationRoomGateway,
  ],
})
export class IncidentsModule {}
