import { apiClient } from "./client";
import type { ArticleCategory } from "@/lib/enums";
import type { ArticleComment, ArticleDetail, ArticleListResult, CreateArticleInput } from "./types";

export const knowledgeApi = {
  list: (search?: string, category?: ArticleCategory) =>
    apiClient.get<ArticleListResult>("/articles", { params: { search: search || undefined, category } }).then((r) => r.data),

  detail: (articleId: string) => apiClient.get<ArticleDetail>(`/articles/${articleId}`).then((r) => r.data),

  create: (input: CreateArticleInput) => apiClient.post<{ id: string }>("/articles", input).then((r) => r.data),

  toggleSave: (articleId: string) =>
    apiClient.post<{ saved: boolean; saveCount: number }>(`/articles/${articleId}/save`).then((r) => r.data),

  addComment: (articleId: string, content: string) =>
    apiClient.post<ArticleComment>(`/articles/${articleId}/comments`, { content }).then((r) => r.data),

  reportComment: (articleId: string, commentId: string) =>
    apiClient.post<{ ok: true }>(`/articles/${articleId}/comments/${commentId}/report`),

  deleteComment: (articleId: string, commentId: string) => apiClient.delete<{ ok: true }>(`/articles/${articleId}/comments/${commentId}`),
};
