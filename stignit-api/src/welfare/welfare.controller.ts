import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { WelfareCheckService } from './welfare-check.service';

class WelfareResponseDto {
  @IsEnum(['SAFE', 'NEED_HELP'] as any)
  response: 'SAFE' | 'NEED_HELP';
}

/**
 * PRD 10.1 welfare-response. The welfare check is pre-incident, so responses are
 * keyed by sessionId (not incidentId); cancellation is keyed by the incident
 * created on escalation. (Naming diverges slightly from the PRD's
 * /incidents/{id}/welfare-response — flagged; session-scoped is more correct.)
 */
@ApiTags('welfare')
@ApiBearerAuth('user-jwt')
@Controller({ path: 'welfare', version: '1' })
export class WelfareController {
  constructor(private readonly welfare: WelfareCheckService) {}

  @Post(':sessionId/respond')
  @ApiOperation({ summary: 'Respond to a welfare check (SAFE / NEED_HELP)' })
  respond(
    @CurrentUser() u: AuthUser,
    @Param('sessionId') sessionId: string,
    @Body() dto: WelfareResponseDto,
  ) {
    return this.welfare.respond(sessionId, u.userId, dto.response);
  }

  @Post('incidents/:incidentId/cancel')
  @ApiOperation({ summary: 'Cancel an escalation within the 30s window (false alarm)' })
  cancel(@CurrentUser() u: AuthUser, @Param('incidentId') incidentId: string) {
    return this.welfare.cancel(incidentId, u.userId);
  }
}
