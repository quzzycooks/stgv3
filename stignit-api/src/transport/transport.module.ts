import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { IncidentsModule } from '../incidents/incidents.module';
import { DISPATCH_QUEUE } from '../messaging/queue.tokens';
import { DispatchProcessor } from './dispatch.processor';
import { DriverAuthGuard } from './driver-auth.guard';
import { DriverController } from './driver.controller';
import { HospitalRecommendationService } from './hospital-recommendation.service';
import { DispatchSubscriber } from './subscribers/dispatch.subscriber';
import { TransportController } from './transport.controller';
import { TransportService } from './transport.service';

/** Transport coordination + hospital recommendation (PRD 6.7). */
@Module({
  imports: [BullModule.registerQueue({ name: DISPATCH_QUEUE }), JwtModule.register({}), IncidentsModule],
  controllers: [TransportController, DriverController],
  providers: [
    TransportService,
    HospitalRecommendationService,
    DispatchProcessor,
    DispatchSubscriber,
    DriverAuthGuard,
  ],
  exports: [TransportService, HospitalRecommendationService],
})
export class TransportModule {}
