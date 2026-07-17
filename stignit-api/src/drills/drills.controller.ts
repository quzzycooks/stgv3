import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { DrillsService } from './drills.service';
import { StartSessionDto, SubmitResponseDto } from './dto/drill.dto';

@ApiTags('drills')
@ApiBearerAuth('user-jwt')
@Controller({ path: 'drills', version: '1' })
export class DrillsController {
  constructor(private readonly drills: DrillsService) {}

  @Post('sessions')
  @ApiOperation({ summary: 'Start a drill session (PRD 10.1)' })
  start(@CurrentUser() u: AuthUser, @Body() dto: StartSessionDto) {
    return this.drills.startSession(u.userId, dto.category);
  }

  @Post('sessions/:sessionId/response')
  @ApiOperation({ summary: 'Submit a drill scenario response (grades + recalcs tier)' })
  respond(
    @CurrentUser() u: AuthUser,
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitResponseDto,
  ) {
    return this.drills.submitResponse(
      u.userId,
      sessionId,
      dto.chosenOptionId,
      dto.timeToDecisionMs,
      dto.hesitationEvents,
    );
  }
}
