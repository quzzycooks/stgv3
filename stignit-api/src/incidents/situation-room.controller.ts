import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { ReporterRole, TriggerType } from '../database/enums';
import {
  ConfirmProximityDto,
  ManualTriggerDto,
  TransitionDto,
  UpdateLocationDto,
} from './dto/incident.dto';
import { IncidentAccessGuard } from './incident-access.guard';
import { ProximityService } from './proximity.service';
import { SituationRoomGateway } from './situation-room.gateway';
import { SituationRoomService } from './situation-room.service';

@ApiTags('incidents')
@ApiBearerAuth('user-jwt')
@Controller({ path: 'incidents', version: '1' })
export class SituationRoomController {
  private readonly logger = new Logger(SituationRoomController.name);

  constructor(
    private readonly rooms: SituationRoomService,
    private readonly proximity: ProximityService,
    private readonly gateway: SituationRoomGateway,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Manual emergency trigger → create Situation Room (PRD 6.5.2)' })
  async manualTrigger(@CurrentUser() u: AuthUser, @Body() dto: ManualTriggerDto) {
    this.logger.log(
      `Incident trigger by ${u.userId}, locationSource=${dto.locationSource ?? 'unknown'}`,
    );
    const incident = await this.rooms.create({
      triggerType: TriggerType.MANUAL,
      incidentType: dto.incidentType,
      triggeringUserId: u.userId,
      gps: dto.gps ?? null,
      occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
      observerMode: false,
      reporterRole: dto.reporterRole ?? ReporterRole.INVOLVED,
    });
    return { incidentId: incident.incidentId, status: incident.status };
  }

  @Get('mine/active')
  @ApiOperation({ summary: "Caller's most recent non-terminal incident, if any" })
  async myActiveIncident(@CurrentUser() u: AuthUser) {
    const incident = await this.rooms.findActiveIncidentForTriggeringUser(u.userId);
    return { incidentId: incident?.incidentId ?? null, status: incident?.status ?? null };
  }

  // Must stay ahead of the ':incidentId' route below — 'mine' would otherwise
  // be swallowed as a param value.
  @Get('mine')
  @ApiOperation({ summary: "Caller's own incident history, most recent first" })
  async myIncidents(@CurrentUser() u: AuthUser) {
    const rows = await this.rooms.listForTriggeringUser(u.userId);
    return rows.map((i) => ({
      incidentId: i.incidentId,
      incidentType: i.incidentType,
      status: i.status,
      createdAt: i.createdAt,
      closedAt: i.closedAt,
    }));
  }

  @Post('location')
  @ApiOperation({ summary: 'Update my location (consent-gated; used for proximity)' })
  async updateLocation(@CurrentUser() u: AuthUser, @Body() dto: UpdateLocationDto) {
    await this.proximity.upsertLocation(u.userId, dto.gps.lat, dto.gps.lng, dto.gps.accuracyMeters);
    const active = await this.rooms.findActiveIncidentForTriggeringUser(u.userId);
    if (active) {
      this.gateway.emitToIncident(active.incidentId, 'incident:location', {
        userId: u.userId,
        lat: dto.gps.lat,
        lng: dto.gps.lng,
        accuracyMeters: dto.gps.accuracyMeters ?? null,
        at: new Date().toISOString(),
      });
    }
    return { ok: true };
  }

  @Get(':incidentId')
  @UseGuards(IncidentAccessGuard)
  @ApiOperation({ summary: 'Get Situation Room state (participants/trigger only, PRD 6.5.5)' })
  async get(@Param('incidentId') incidentId: string) {
    const incident = await this.rooms.findById(incidentId);
    return incident;
  }

  @Post(':incidentId/participants/confirm-proximity')
  @UseGuards(IncidentAccessGuard)
  @ApiOperation({ summary: 'Nearby user confirms presence/safety (PRD 6.5.3)' })
  confirmProximity(
    @CurrentUser() u: AuthUser,
    @Param('incidentId') incidentId: string,
    @Body() dto: ConfirmProximityDto,
  ) {
    return this.rooms.confirmProximity(incidentId, u.userId, dto.present);
  }

  @Post(':incidentId/status')
  @UseGuards(IncidentAccessGuard)
  @ApiOperation({ summary: 'Transition incident lifecycle (validated, PRD 6.5.6)' })
  transition(@Param('incidentId') incidentId: string, @Body() dto: TransitionDto) {
    return this.rooms.transition(incidentId, dto.to, { reason: dto.reason });
  }
}
