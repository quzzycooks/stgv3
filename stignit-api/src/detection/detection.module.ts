import { Module } from '@nestjs/common';
import { MaxPayloadGuard } from '../common/max-payload.guard';
import { WelfareModule } from '../welfare/welfare.module';
import { DetectionController } from './detection.controller';
import { DetectionService } from './detection.service';

@Module({
  imports: [WelfareModule],
  controllers: [DetectionController],
  providers: [DetectionService, MaxPayloadGuard],
})
export class DetectionModule {}
