import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IncidentAccessGuard } from '../incidents/incident-access.guard';
import { IncidentDnaService } from './incident-dna.service';

@ApiTags('incident-dna')
@ApiBearerAuth('user-jwt')
@Controller({ path: 'incidents/:incidentId', version: '1' })
export class IncidentDnaController {
  constructor(private readonly dna: IncidentDnaService) {}

  @Get('summary')
  @UseGuards(IncidentAccessGuard)
  @ApiOperation({ summary: 'Post-incident summary / Incident DNA timeline (PRD 6.9)' })
  summary(@Param('incidentId') incidentId: string) {
    return this.dna.getDna(incidentId);
  }
}
