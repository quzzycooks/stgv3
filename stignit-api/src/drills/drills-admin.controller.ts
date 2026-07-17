import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { AdminAuthGuard, AdminRoles } from '../admin-auth/admin-auth.guard';
import { AdminRole } from '../admin-auth/admin-identity';
import { DrillsService } from './drills.service';
import { CreateScenarioDto, SetActiveDto } from './dto/drill.dto';

/**
 * Drill content management (PRD 6.12.2 Drill Management). Admin SSO only,
 * scoped to Content Manager (Super Admin implicitly allowed).
 */
@ApiTags('admin-drills')
@ApiBearerAuth('admin-sso')
@Public() // bypasses mobile JWT guard; AdminAuthGuard secures it
@UseGuards(AdminAuthGuard)
@Controller({ path: 'admin/drills', version: '1' })
export class DrillsAdminController {
  constructor(private readonly drills: DrillsService) {}

  @Post('scenarios')
  @AdminRoles(AdminRole.CONTENT_MANAGER)
  @ApiOperation({ summary: 'Create a drill scenario (recalcs all tiers)' })
  create(@Body() dto: CreateScenarioDto) {
    return this.drills.createScenario(dto as any);
  }

  @Get('scenarios')
  @AdminRoles(AdminRole.CONTENT_MANAGER)
  list() {
    return this.drills.listScenarios();
  }

  @Patch('scenarios/:id/active')
  @AdminRoles(AdminRole.CONTENT_MANAGER)
  setActive(@Param('id') id: string, @Body() dto: SetActiveDto) {
    return this.drills.setActive(id, dto.active);
  }
}
