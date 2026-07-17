import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import {
  EmergencyContactInput,
  RegisterDto,
  SubmitSkillDto,
  UpdateProfileDto,
} from './dto/user.dto';
import { EmergencyContactsService } from './emergency-contacts.service';
import { MedicalAccessService } from './medical-access.service';
import { SkillVerificationService } from './skill-verification.service';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth('user-jwt')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly contacts: EmergencyContactsService,
    private readonly skills: SkillVerificationService,
    private readonly medical: MedicalAccessService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Complete registration for a phone-verified account' })
  register(@CurrentUser() u: AuthUser, @Body() dto: RegisterDto) {
    return this.users.register(u.userId, dto);
  }

  @Get('me')
  getMe(@CurrentUser() u: AuthUser) {
    return this.users.getMe(u.userId);
  }

  @Put('me')
  update(@CurrentUser() u: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(u.userId, dto);
  }

  @Get('me/export')
  @ApiOperation({ summary: 'NDPA self-service data export' })
  export(@CurrentUser() u: AuthUser) {
    return this.users.exportData(u.userId);
  }

  @Delete('me')
  @ApiOperation({ summary: 'Request account deletion (PII purged within 30 days)' })
  requestDeletion(@CurrentUser() u: AuthUser) {
    return this.users.requestDeletion(u.userId);
  }

  // --- Emergency contacts ---
  @Get('me/emergency-contacts')
  listContacts(@CurrentUser() u: AuthUser) {
    return this.contacts.list(u.userId);
  }

  @Post('me/emergency-contacts')
  addContact(@CurrentUser() u: AuthUser, @Body() dto: EmergencyContactInput) {
    return this.contacts.addContacts(u.userId, [dto]);
  }

  @Delete('me/emergency-contacts/:contactId')
  removeContact(@CurrentUser() u: AuthUser, @Param('contactId') contactId: string) {
    return this.contacts.remove(u.userId, contactId);
  }

  // --- Professional skill verification ---
  @Post('me/skill')
  @ApiOperation({ summary: 'Submit professional credential for verification (72h SLA)' })
  submitSkill(@CurrentUser() u: AuthUser, @Body() dto: SubmitSkillDto) {
    return this.skills.submit(u.userId, dto.skill, dto.documentUrl);
  }

  // --- Medical info (incident-scoped, Skilled Responder only) ---
  @Get(':targetUserId/medical')
  @ApiOperation({
    summary: 'Read a victim medical info — verified Skilled Responder, within an active incident',
  })
  getMedical(
    @CurrentUser() u: AuthUser,
    @Param('targetUserId') targetUserId: string,
    @Query('incidentId') incidentId: string,
  ) {
    return this.medical.getMedicalInfo(u.userId, targetUserId, incidentId);
  }
}
