import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MinAccessLevel } from '../auth/guards/access-level.guard';
import { AccessLevel } from '../database/enums';
import { IncidentAccessGuard } from '../incidents/incident-access.guard';
import { HospitalRecommendationService } from './hospital-recommendation.service';
import { TransportService } from './transport.service';

@ApiTags('transport')
@ApiBearerAuth('user-jwt')
@Controller({ path: 'incidents/:incidentId/transport', version: '1' })
@UseGuards(IncidentAccessGuard)
export class TransportController {
  constructor(
    private readonly transport: TransportService,
    private readonly hospitals: HospitalRecommendationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Transport status + driver ETA (PRD 10.1)' })
  status(@Param('incidentId') incidentId: string) {
    return this.transport.getTransportStatus(incidentId);
  }

  @Post('dispatch')
  // Coordinating a dispatch is a Tier1+ action.
  @MinAccessLevel(AccessLevel.TIER1)
  @ApiOperation({ summary: 'Manually (re)trigger driver dispatch' })
  dispatch(@Param('incidentId') incidentId: string) {
    return this.transport.requestDispatch(incidentId);
  }

  @Get('hospital-recommendation')
  @ApiOperation({ summary: 'Hospital recommendation for the incident location (PRD 6.7.4)' })
  async hospital(
    @Param('incidentId') incidentId: string,
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('cardiac') cardiac?: string,
  ) {
    return this.hospitals.recommend(parseFloat(lat), parseFloat(lng), {
      needsCardiac: cardiac === 'true',
    });
  }
}
