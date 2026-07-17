import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import { DRIZZLE, type Db } from '../database/drizzle.module';
import { ArticleCategory, ProfessionalSkill } from '../database/enums';
import { articleComments, articles, articleSaves, users, type Article, type ArticleComment } from '../database/schema';
import { first } from '../database/util';
import { CreateArticleDto } from './dto/knowledge.dto';

export type AuthorBadge = 'DOCTOR' | 'PARAMEDIC' | 'COMMUNITY';

export interface ArticleAuthor {
  userId: string;
  name: string;
  badge: AuthorBadge;
}

function deriveBadge(skill: ProfessionalSkill | null, verified: boolean | null): AuthorBadge {
  if (verified && skill === ProfessionalSkill.MEDICAL_DOCTOR) return 'DOCTOR';
  if (verified && skill === ProfessionalSkill.NURSE_PARAMEDIC) return 'PARAMEDIC';
  return 'COMMUNITY';
}

@Injectable()
export class KnowledgeService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  private async authorsFor(userIds: string[]): Promise<Map<string, ArticleAuthor>> {
    if (userIds.length === 0) return new Map();
    const rows = await this.db
      .select({
        id: users.id,
        fullName: users.fullName,
        professionalSkill: users.professionalSkill,
        skillVerified: users.skillVerified,
      })
      .from(users)
      .where(inArray(users.id, [...new Set(userIds)]));

    return new Map(
      rows.map((u) => [
        u.id,
        { userId: u.id, name: u.fullName, badge: deriveBadge(u.professionalSkill as ProfessionalSkill | null, u.skillVerified) },
      ]),
    );
  }

  private async savedArticleIds(userId: string, articleIds: string[]): Promise<Set<string>> {
    if (articleIds.length === 0) return new Set();
    const rows = await this.db
      .select({ articleId: articleSaves.articleId })
      .from(articleSaves)
      .where(and(eq(articleSaves.userId, userId), inArray(articleSaves.articleId, articleIds)));
    return new Set(rows.map((r) => r.articleId));
  }

  private toSummary(article: Article, author: ArticleAuthor | undefined, saved: boolean) {
    return {
      id: article.id,
      title: article.title,
      summary: article.summary,
      category: article.category,
      author: author ?? { userId: article.authorUserId, name: 'Unknown', badge: 'COMMUNITY' as const },
      readTimeMinutes: article.readTimeMinutes,
      saveCount: article.saveCount,
      reviewed: article.reviewed,
      featured: article.featured,
      createdAt: article.createdAt,
      saved,
    };
  }

  async list(userId: string, search?: string, category?: ArticleCategory) {
    const conds: SQL[] = [];
    if (category) conds.push(eq(articles.category, category));
    if (search?.trim()) {
      const term = `%${search.trim()}%`;
      const clause = or(ilike(articles.title, term), ilike(articles.summary, term), ilike(articles.content, term));
      if (clause) conds.push(clause);
    }

    const rows = await this.db
      .select()
      .from(articles)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(articles.featured), desc(articles.createdAt));

    const authors = await this.authorsFor(rows.map((r) => r.authorUserId));
    const saved = await this.savedArticleIds(userId, rows.map((r) => r.id));

    const summaries = rows.map((r) => this.toSummary(r, authors.get(r.authorUserId), saved.has(r.id)));
    const featured = summaries.find((s) => s.featured) ?? null;
    const rest = featured ? summaries.filter((s) => s.id !== featured.id) : summaries;

    return { featured, articles: rest };
  }

  async getDetail(userId: string, articleId: string) {
    const article = first(await this.db.select().from(articles).where(eq(articles.id, articleId)).limit(1));
    if (!article) throw new NotFoundException('Article not found');

    const comments = await this.db
      .select()
      .from(articleComments)
      .where(eq(articleComments.articleId, articleId))
      .orderBy(desc(articleComments.createdAt));

    const authorIds = [article.authorUserId, ...comments.map((c) => c.userId)];
    const authors = await this.authorsFor(authorIds);
    const saved = await this.savedArticleIds(userId, [articleId]);

    return {
      ...this.toSummary(article, authors.get(article.authorUserId), saved.has(articleId)),
      content: article.content,
      comments: comments.map((c) => this.toCommentDto(c, authors.get(c.userId))),
    };
  }

  private toCommentDto(comment: ArticleComment, author: ArticleAuthor | undefined) {
    return {
      id: comment.id,
      content: comment.content,
      flagged: comment.flagged,
      createdAt: comment.createdAt,
      author: author ?? { userId: comment.userId, name: 'Unknown', badge: 'COMMUNITY' as const },
    };
  }

  async create(userId: string, dto: CreateArticleDto) {
    const author = first(
      await this.db
        .select({ professionalSkill: users.professionalSkill, skillVerified: users.skillVerified })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1),
    );
    const badge = deriveBadge(author?.professionalSkill as ProfessionalSkill | null, author?.skillVerified ?? false);
    if (badge === 'COMMUNITY') {
      throw new ForbiddenException('Only verified doctors or paramedics can publish articles');
    }

    const [row] = await this.db
      .insert(articles)
      .values({
        title: dto.title,
        summary: dto.summary,
        content: dto.content,
        category: dto.category,
        authorUserId: userId,
        readTimeMinutes: dto.readTimeMinutes ?? 3,
      })
      .returning();
    return row;
  }

  async toggleSave(userId: string, articleId: string) {
    const article = first(await this.db.select({ id: articles.id }).from(articles).where(eq(articles.id, articleId)).limit(1));
    if (!article) throw new NotFoundException('Article not found');

    const existing = first(
      await this.db
        .select()
        .from(articleSaves)
        .where(and(eq(articleSaves.articleId, articleId), eq(articleSaves.userId, userId)))
        .limit(1),
    );

    if (existing) {
      await this.db.delete(articleSaves).where(eq(articleSaves.id, existing.id));
      const [updated] = await this.db
        .update(articles)
        .set({ saveCount: sql`greatest(${articles.saveCount} - 1, 0)` })
        .where(eq(articles.id, articleId))
        .returning({ saveCount: articles.saveCount });
      return { saved: false, saveCount: updated.saveCount };
    }

    await this.db.insert(articleSaves).values({ articleId, userId });
    const [updated] = await this.db
      .update(articles)
      .set({ saveCount: sql`${articles.saveCount} + 1` })
      .where(eq(articles.id, articleId))
      .returning({ saveCount: articles.saveCount });
    return { saved: true, saveCount: updated.saveCount };
  }

  async addComment(userId: string, articleId: string, content: string) {
    const article = first(await this.db.select({ id: articles.id }).from(articles).where(eq(articles.id, articleId)).limit(1));
    if (!article) throw new NotFoundException('Article not found');

    const [comment] = await this.db.insert(articleComments).values({ articleId, userId, content }).returning();
    const authors = await this.authorsFor([userId]);
    return this.toCommentDto(comment, authors.get(userId));
  }

  async reportComment(articleId: string, commentId: string) {
    const comment = first(await this.db.select().from(articleComments).where(eq(articleComments.id, commentId)).limit(1));
    if (!comment || comment.articleId !== articleId) throw new NotFoundException('Comment not found');
    await this.db.update(articleComments).set({ flagged: true }).where(eq(articleComments.id, commentId));
    return { ok: true };
  }

  async deleteComment(userId: string, articleId: string, commentId: string) {
    const comment = first(await this.db.select().from(articleComments).where(eq(articleComments.id, commentId)).limit(1));
    if (!comment || comment.articleId !== articleId) throw new NotFoundException('Comment not found');

    const article = first(await this.db.select({ authorUserId: articles.authorUserId }).from(articles).where(eq(articles.id, articleId)).limit(1));
    const isOwnComment = comment.userId === userId;
    const isArticleAuthor = article?.authorUserId === userId;
    if (!isOwnComment && !isArticleAuthor) {
      throw new ForbiddenException('Only the comment author or the article author can delete this comment');
    }

    await this.db.delete(articleComments).where(eq(articleComments.id, commentId));
    return { ok: true };
  }

  // --- Admin (Content Manager) ---

  async markReviewed(adminId: string, articleId: string) {
    const article = first(await this.db.select({ id: articles.id }).from(articles).where(eq(articles.id, articleId)).limit(1));
    if (!article) throw new NotFoundException('Article not found');
    await this.db
      .update(articles)
      .set({ reviewed: true, reviewedByAdminId: adminId, reviewedAt: new Date() })
      .where(eq(articles.id, articleId));
    return { ok: true };
  }

  async adminDeleteComment(commentId: string) {
    const comment = first(await this.db.select({ id: articleComments.id }).from(articleComments).where(eq(articleComments.id, commentId)).limit(1));
    if (!comment) throw new NotFoundException('Comment not found');
    await this.db.delete(articleComments).where(eq(articleComments.id, commentId));
    return { ok: true };
  }
}
