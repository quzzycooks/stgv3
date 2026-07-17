import { Controller, Delete, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { AdminAuthGuard, AdminRoles } from '../admin-auth/admin-auth.guard';
import { AdminRole } from '../admin-auth/admin-identity';
import { KnowledgeService } from './knowledge.service';

/** Knowledge Library moderation. Admin SSO only, scoped to Content Manager. */
@ApiTags('admin-knowledge')
@ApiBearerAuth('admin-sso')
@Public() // bypasses mobile JWT guard; AdminAuthGuard secures it
@UseGuards(AdminAuthGuard)
@Controller({ path: 'admin/articles', version: '1' })
export class KnowledgeAdminController {
  constructor(private readonly knowledge: KnowledgeService) {}

  @Patch(':articleId/review')
  @AdminRoles(AdminRole.CONTENT_MANAGER)
  @ApiOperation({ summary: 'Mark an article as clinically reviewed' })
  markReviewed(@Req() req: any, @Param('articleId') articleId: string) {
    return this.knowledge.markReviewed(req.admin.adminId, articleId);
  }

  @Delete('comments/:commentId')
  @AdminRoles(AdminRole.CONTENT_MANAGER)
  @ApiOperation({ summary: 'Remove a comment (moderation)' })
  deleteComment(@Param('commentId') commentId: string) {
    return this.knowledge.adminDeleteComment(commentId);
  }
}
