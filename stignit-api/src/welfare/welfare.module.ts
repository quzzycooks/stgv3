import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { IncidentsModule } from '../incidents/incidents.module';
import { WELFARE_QUEUE } from '../messaging/queue.tokens';
import { WelfareController } from './welfare.controller';
import { WelfareCheckService } from './welfare-check.service';
import { WelfareProcessor } from './welfare.processor';

@Module({
  imports: [BullModule.registerQueue({ name: WELFARE_QUEUE }), IncidentsModule],
  controllers: [WelfareController],
  providers: [WelfareCheckService, WelfareProcessor],
  exports: [WelfareCheckService],
})
export class WelfareModule {}
