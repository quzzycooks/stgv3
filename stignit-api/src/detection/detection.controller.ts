import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { MaxPayloadBytes, MaxPayloadGuard } from '../common/max-payload.guard';
import { AnomalyReportDto } from './dto/anomaly.dto';
import { DetectionService } from './detection.service';

@ApiTags('detection')
@ApiBearerAuth('user-jwt')
@Controller({ path: 'detection', version: '1' })
export class DetectionController {
  constructor(private readonly detection: DetectionService) {}

  @Post('anomaly')
  // PRD 7.4: critical payload <5KB — rejected explicitly if oversized.
  @MaxPayloadBytes(5120)
  @UseGuards(MaxPayloadGuard)
  @ApiOperation({ summary: 'Report an on-device composite anomaly score (no audio, PRD 6.3.3)' })
  report(@CurrentUser() u: AuthUser, @Body() dto: AnomalyReportDto) {
    return this.detection.processAnomaly(u.userId, dto);
  }
}
