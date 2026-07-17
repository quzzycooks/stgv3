import { Module } from '@nestjs/common';
import { DrillsAdminController } from './drills-admin.controller';
import { DrillsController } from './drills.controller';
import { DrillsService } from './drills.service';

@Module({
  controllers: [DrillsController, DrillsAdminController],
  providers: [DrillsService],
  exports: [DrillsService],
})
export class DrillsModule {}
