import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { AdminAuthGuard, AdminRoles } from '../admin-auth/admin-auth.guard';
import { AdminRole } from '../admin-auth/admin-identity';
import { AccountStatus, IncidentStatus } from '../database/enums';
import { AdminService } from './admin.service';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from './audit.service';
import { IncidentPdfService } from './incident-pdf.service';

/**
 * Admin & Operations dashboard API (PRD 6.12). Admin SSO only, every route
 * role-scoped server-side, every mutation audit-logged. NOT the mobile API.
 */
@ApiTags('admin')
@ApiBearerAuth('admin-sso')
@Public() // opt out of mobile JWT; AdminAuthGuard secures all routes
@UseGuards(AdminAuthGuard)
@UseInterceptors(AuditInterceptor)
@Controller({ path: 'admin', version: '1' })
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly pdf: IncidentPdfService,
    private readonly audit: AuditService,
  ) {}

  // --- Incidents ---
  @Get('incidents')
  @AdminRoles(AdminRole.OPERATIONS_MANAGER, AdminRole.ANALYTICS_VIEWER)
  incidents(@Query('status') status?: IncidentStatus) {
    return this.admin.listIncidents(status);
  }

  @Get('incidents/:incidentId')
  @AdminRoles(AdminRole.OPERATIONS_MANAGER, AdminRole.ANALYTICS_VIEWER)
  incidentDetail(@Param('incidentId') incidentId: string) {
    return this.admin.incidentDetail(incidentId);
  }

  @Get('incidents/:incidentId/pdf')
  @AdminRoles(AdminRole.OPERATIONS_MANAGER)
  @ApiOperation({ summary: 'Audit-ready Incident DNA PDF' })
  async incidentPdf(@Param('incidentId') incidentId: string, @Res() res: Response) {
    const buf = await this.pdf.generate(incidentId);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${incidentId}.pdf"` });
    res.send(buf);
  }

  // --- Users ---
  @Get('users')
  @AdminRoles(AdminRole.OPERATIONS_MANAGER)
  users() {
    return this.admin.listUsers();
  }

  @Patch('users/:userId/status')
  @AdminRoles(AdminRole.OPERATIONS_MANAGER)
  setUserStatus(@Param('userId') userId: string, @Body('status') status: AccountStatus) {
    return this.admin.setUserStatus(userId, status);
  }

  @Get('verification-queue')
  @AdminRoles(AdminRole.OPERATIONS_MANAGER)
  verificationQueue() {
    return this.admin.verificationQueue();
  }

  @Post('verification-queue/:id/review')
  @AdminRoles(AdminRole.OPERATIONS_MANAGER)
  reviewSkill(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { approve: boolean; notes?: string },
  ) {
    return this.admin.reviewSkill(id, req.admin.adminId, body.approve, body.notes);
  }

  // --- Drivers ---
  @Get('drivers')
  @AdminRoles(AdminRole.OPERATIONS_MANAGER)
  drivers() {
    return this.admin.listDrivers();
  }

  @Post('drivers')
  @AdminRoles(AdminRole.OPERATIONS_MANAGER)
  createDriver(@Body() body: any) {
    return this.admin.createDriver(body);
  }

  @Patch('drivers/:driverId/verification')
  @AdminRoles(AdminRole.OPERATIONS_MANAGER)
  verifyDriver(@Param('driverId') driverId: string, @Body() gates: any) {
    return this.admin.setDriverVerification(driverId, gates);
  }

  // --- Institutional ---
  @Post('institutional-contacts')
  @AdminRoles(AdminRole.OPERATIONS_MANAGER)
  addContact(@Body() body: any) {
    return this.admin.addContact(body);
  }

  @Get('institutional/flagged')
  @AdminRoles(AdminRole.OPERATIONS_MANAGER)
  flagged() {
    return this.admin.flaggedDispatches();
  }

  // --- Risk intelligence ---
  @Post('risk-zones/recompute')
  @AdminRoles(AdminRole.OPERATIONS_MANAGER)
  recompute() {
    return this.admin.recomputeRiskZones();
  }

  // --- Analytics ---
  @Get('kpis')
  @AdminRoles(AdminRole.OPERATIONS_MANAGER, AdminRole.ANALYTICS_VIEWER)
  kpis() {
    return this.admin.kpis();
  }

  @Get('audit-logs')
  @AdminRoles(AdminRole.SUPER_ADMIN)
  auditLogs(@Query('adminId') adminId?: string) {
    return this.audit.list(adminId);
  }
}
