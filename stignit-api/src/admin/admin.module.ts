import { Module } from '@nestjs/common';
import { IncidentDnaModule } from '../incident-dna/incident-dna.module';
import { InstitutionalModule } from '../institutional/institutional.module';
import { UsersModule } from '../users/users.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from './audit.service';
import { IncidentPdfService } from './incident-pdf.service';

/** Admin & Operations dashboard (PRD 6.12). */
@Module({
  imports: [IncidentDnaModule, InstitutionalModule, UsersModule],
  controllers: [AdminController],
  providers: [AdminService, IncidentPdfService, AuditService, AuditInterceptor],
})
export class AdminModule {}
