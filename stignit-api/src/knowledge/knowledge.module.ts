import { Module } from '@nestjs/common';
import { KnowledgeAdminController } from './knowledge-admin.controller';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';

@Module({
  controllers: [KnowledgeController, KnowledgeAdminController],
  providers: [KnowledgeService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
