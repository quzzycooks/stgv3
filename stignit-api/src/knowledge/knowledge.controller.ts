import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { ArticleCategory } from '../database/enums';
import { AddCommentDto, CreateArticleDto } from './dto/knowledge.dto';
import { KnowledgeService } from './knowledge.service';

@ApiTags('knowledge')
@ApiBearerAuth('user-jwt')
@Controller({ path: 'articles', version: '1' })
export class KnowledgeController {
  constructor(private readonly knowledge: KnowledgeService) {}

  @Get()
  @ApiOperation({ summary: 'Search/browse Knowledge Library articles' })
  list(@CurrentUser() u: AuthUser, @Query('search') search?: string, @Query('category') category?: ArticleCategory) {
    return this.knowledge.list(u.userId, search, category);
  }

  @Get(':articleId')
  @ApiOperation({ summary: 'Article detail with comments' })
  detail(@CurrentUser() u: AuthUser, @Param('articleId') articleId: string) {
    return this.knowledge.getDetail(u.userId, articleId);
  }

  @Post()
  @ApiOperation({ summary: 'Publish an article — verified doctors/paramedics only' })
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateArticleDto) {
    return this.knowledge.create(u.userId, dto);
  }

  @Post(':articleId/save')
  @ApiOperation({ summary: 'Toggle saving an article' })
  toggleSave(@CurrentUser() u: AuthUser, @Param('articleId') articleId: string) {
    return this.knowledge.toggleSave(u.userId, articleId);
  }

  @Post(':articleId/comments')
  @ApiOperation({ summary: 'Add a comment to an article' })
  addComment(@CurrentUser() u: AuthUser, @Param('articleId') articleId: string, @Body() dto: AddCommentDto) {
    return this.knowledge.addComment(u.userId, articleId, dto.content);
  }

  @Post(':articleId/comments/:commentId/report')
  @ApiOperation({ summary: 'Report a comment as inappropriate' })
  reportComment(@Param('articleId') articleId: string, @Param('commentId') commentId: string) {
    return this.knowledge.reportComment(articleId, commentId);
  }

  @Delete(':articleId/comments/:commentId')
  @ApiOperation({ summary: 'Delete a comment — comment author or article author only' })
  deleteComment(@CurrentUser() u: AuthUser, @Param('articleId') articleId: string, @Param('commentId') commentId: string) {
    return this.knowledge.deleteComment(u.userId, articleId, commentId);
  }
}
