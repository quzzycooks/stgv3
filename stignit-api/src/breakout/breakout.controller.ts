import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { IncidentAccessGuard } from '../incidents/incident-access.guard';
import { SituationRoomGateway } from '../incidents/situation-room.gateway';
import { AiGuidanceService } from './ai/ai-guidance.service';
import { BreakoutRoomService } from './breakout-room.service';
import { AcceptRoleDto, AiQueryDto, ModerateDto, SendMessageDto } from './dto/breakout.dto';

@ApiTags('breakout')
@ApiBearerAuth('user-jwt')
@UseGuards(IncidentAccessGuard) // membership enforced on every route (PRD 6.6.2)
@Controller({ path: 'incidents/:incidentId/breakout', version: '1' })
export class BreakoutController {
  constructor(
    private readonly breakout: BreakoutRoomService,
    private readonly ai: AiGuidanceService,
    private readonly gateway: SituationRoomGateway,
  ) {}

  @Post('join')
  @ApiOperation({ summary: 'Join the Breakout Room (Observers/overflow are read-only)' })
  join(@CurrentUser() u: AuthUser, @Param('incidentId') incidentId: string) {
    return this.breakout.join(incidentId, u.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get Breakout Room message history (PRD 10.1)' })
  messages(@Param('incidentId') incidentId: string) {
    return this.breakout.getMessages(incidentId);
  }

  @Post('messages')
  @ApiOperation({ summary: 'Send a message (Tier1+ only; immutable)' })
  async send(
    @CurrentUser() u: AuthUser,
    @Param('incidentId') incidentId: string,
    @Body() dto: SendMessageDto,
  ) {
    const msg = await this.breakout.sendMessage(incidentId, u.userId, dto.content);
    this.gateway.emitToIncident(incidentId, 'breakout:message', msg);
    return msg;
  }

  @Post('roles')
  @ApiOperation({ summary: 'Accept a coordination role (eligibility enforced)' })
  acceptRole(
    @CurrentUser() u: AuthUser,
    @Param('incidentId') incidentId: string,
    @Body() dto: AcceptRoleDto,
  ) {
    return this.breakout.acceptRole(incidentId, u.userId, dto.role);
  }

  @Post('moderate')
  @ApiOperation({ summary: 'Moderator action (mute/remove/flag)' })
  moderate(
    @CurrentUser() u: AuthUser,
    @Param('incidentId') incidentId: string,
    @Body() dto: ModerateDto,
  ) {
    return this.breakout.moderatorAction(incidentId, u.userId, dto.targetUserId, dto.action);
  }

  @Post('ai')
  @ApiOperation({ summary: 'Query the AI Support Engine (filtered; Tier1+)' })
  ai_query(
    @CurrentUser() u: AuthUser,
    @Param('incidentId') incidentId: string,
    @Body() dto: AiQueryDto,
  ) {
    return this.ai.query(incidentId, u.userId, dto.question);
  }
}
