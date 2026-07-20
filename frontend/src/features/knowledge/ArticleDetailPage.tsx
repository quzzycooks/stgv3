import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Bookmark, Check, Clock, ShieldCheck, Flag, Trash2, Send, Share2, AlertCircle } from "lucide-react";
import { knowledgeApi } from "@/api/knowledge";
import { extractErrorMessage } from "@/api/client";
import { useAuthStore } from "@/stores/authStore";
import { ARTICLE_CATEGORY_LABEL, AUTHOR_BADGE_LABEL, type AuthorBadge } from "@/lib/enums";
import { cn } from "@/lib/cn";

const BADGE_TONE: Record<AuthorBadge, string> = {
  DOCTOR: "bg-tint-success text-success",
  PARAMEDIC: "bg-tint-accent text-accent",
  COMMUNITY: "bg-card-elevated text-muted border border-subtle",
};

export function ArticleDetailPage() {
  const { articleId } = useParams<{ articleId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.session?.userId);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());
  const [shareCopied, setShareCopied] = useState(false);

  const { data: article, isLoading } = useQuery({
    queryKey: ["article", articleId],
    queryFn: () => knowledgeApi.detail(articleId!),
    enabled: Boolean(articleId),
  });

  const toggleSave = useMutation({
    mutationFn: () => knowledgeApi.toggleSave(articleId!),
    onSuccess: (result) => {
      queryClient.setQueryData(["article", articleId], (prev: typeof article) =>
        prev ? { ...prev, saved: result.saved, saveCount: result.saveCount } : prev,
      );
      queryClient.invalidateQueries({ queryKey: ["articles"] });
    },
  });

  const addComment = useMutation({
    mutationFn: (content: string) => knowledgeApi.addComment(articleId!, content),
    onSuccess: (newComment) => {
      queryClient.setQueryData(["article", articleId], (prev: typeof article) =>
        prev ? { ...prev, comments: [newComment, ...prev.comments] } : prev,
      );
      setComment("");
      setError(null);
    },
    onError: (err) => setError(extractErrorMessage(err, "Couldn't post your comment.")),
  });

  const reportComment = useMutation({
    mutationFn: (commentId: string) => knowledgeApi.reportComment(articleId!, commentId),
    onSuccess: (_, commentId) => setReportedIds((prev) => new Set(prev).add(commentId)),
  });

  const deleteComment = useMutation({
    mutationFn: (commentId: string) => knowledgeApi.deleteComment(articleId!, commentId),
    onSuccess: (_, commentId) => {
      queryClient.setQueryData(["article", articleId], (prev: typeof article) =>
        prev ? { ...prev, comments: prev.comments.filter((c) => c.id !== commentId) } : prev,
      );
    },
  });

  if (isLoading || !article) {
    return (
      <div className="app-shell flex min-h-dvh items-center justify-center bg-canvas">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-[var(--border-subtle)] border-t-primary" />
      </div>
    );
  }

  const canDeleteComment = (commentAuthorId: string) => currentUserId === commentAuthorId || currentUserId === article.author.userId;

  const handleShare = async () => {
    const url = `${window.location.origin}/knowledge/${articleId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: article.title, text: article.summary, url });
      } catch {
        // User cancelled the share sheet — not an error.
      }
      return;
    }
    await navigator.clipboard.writeText(url);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  return (
    <div className="app-shell flex min-h-dvh flex-col bg-canvas">
      <div className="safe-top flex items-center justify-between px-6 pt-5">
        <button onClick={() => navigate(-1)} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full bg-card-elevated text-body">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            aria-label="Share article"
            className="grid h-10 w-10 place-items-center rounded-full bg-card-elevated text-body"
          >
            {shareCopied ? <Check size={16} className="text-success" /> : <Share2 size={16} />}
          </button>
          <button
            onClick={() => toggleSave.mutate()}
            aria-label={article.saved ? "Unsave article" : "Save article"}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold",
              article.saved ? "bg-primary text-white" : "bg-card-elevated text-body",
            )}
          >
            <Bookmark size={15} fill={article.saved ? "currentColor" : "none"} />
            {article.saveCount}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-40 pt-5">
        <span className="text-xs font-bold uppercase tracking-wide text-accent">{ARTICLE_CATEGORY_LABEL[article.category]}</span>
        <h1 className="mt-2 font-serif text-[26px] font-bold leading-tight text-body">{article.title}</h1>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-tint-primary text-sm font-bold text-primary">
              {article.author.name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-semibold text-body">{article.author.name}</p>
              <span className={cn("mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold", BADGE_TONE[article.author.badge])}>
                {AUTHOR_BADGE_LABEL[article.author.badge]}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-faint">
            <Clock size={13} /> {article.readTimeMinutes} min read
          </div>
        </div>

        {article.reviewed && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-tint-success px-4 py-2.5 text-xs font-semibold text-success">
            <ShieldCheck size={15} /> Clinically reviewed
          </div>
        )}

        <div className="mt-6 flex flex-col gap-4">
          {article.content.split("\n\n").map((paragraph, i) => (
            <p key={i} className="text-[15px] leading-[1.75] text-body">
              {paragraph}
            </p>
          ))}
        </div>

        {/* Comments */}
        <div className="mt-10 border-t border-subtle pt-6">
          <h2 className="font-serif text-lg font-bold text-body">Comments ({article.comments.length})</h2>

          <div className="mt-4 flex flex-col gap-4">
            {article.comments.length === 0 && <p className="text-sm text-faint">Be the first to comment.</p>}

            {article.comments.map((c) => (
              <div key={c.id} className="rounded-2xl border border-subtle bg-card-elevated p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-body">{c.author.name}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-bold", BADGE_TONE[c.author.badge])}>
                      {AUTHOR_BADGE_LABEL[c.author.badge]}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {!reportedIds.has(c.id) ? (
                      <button
                        onClick={() => reportComment.mutate(c.id)}
                        aria-label="Report comment"
                        className="grid h-7 w-7 place-items-center rounded-full text-faint"
                      >
                        <Flag size={13} />
                      </button>
                    ) : (
                      <span className="text-[10px] font-semibold text-faint">Reported</span>
                    )}
                    {canDeleteComment(c.author.userId) && (
                      <button
                        onClick={() => deleteComment.mutate(c.id)}
                        aria-label="Delete comment"
                        className="grid h-7 w-7 place-items-center rounded-full text-primary"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-body">{c.content}</p>
                <p className="mt-2 text-[11px] text-faint">{new Date(c.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Comment composer */}
      <div className="safe-bottom fixed inset-x-0 bottom-0 mx-auto max-w-[480px] border-t border-subtle bg-card px-4 py-3">
        {error && (
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-primary">
            <AlertCircle size={13} /> {error}
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && comment.trim() && addComment.mutate(comment)}
            placeholder="Add a comment…"
            className="h-12 flex-1 rounded-2xl border border-subtle bg-card-elevated px-4 text-[15px] text-body outline-none focus:border-accent"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => comment.trim() && addComment.mutate(comment)}
            disabled={!comment.trim() || addComment.isPending}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-white disabled:opacity-40"
          >
            <Send size={18} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
