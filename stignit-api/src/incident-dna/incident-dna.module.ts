import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { IncidentsModule } from '../incidents/incidents.module';
import { DNA_QUEUE } from '../messaging/queue.tokens';
import { DnaMaintenanceProcessor } from './dna-maintenance.processor';
import { DnaSubscriber } from './dna.subscriber';
import { IncidentDnaController } from './incident-dna.controller';
import { IncidentDnaService } from './incident-dna.service';
import { RiskZoneService } from './risk-zone.service';

@Module({
  imports: [BullModule.registerQueue({ name: DNA_QUEUE }), IncidentsModule],
  controllers: [IncidentDnaController],
  providers: [IncidentDnaService, RiskZoneService, DnaSubscriber, DnaMaintenanceProcessor],
  exports: [IncidentDnaService, RiskZoneService],
})
export class IncidentDnaModule {}
