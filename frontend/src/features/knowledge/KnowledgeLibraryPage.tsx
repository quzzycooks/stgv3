import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Search, Bookmark, Clock, BookOpen } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { knowledgeApi } from "@/api/knowledge";
import { ArticleCategory, ARTICLE_CATEGORY_LABEL, AUTHOR_BADGE_LABEL, type AuthorBadge } from "@/lib/enums";
import { cn } from "@/lib/cn";

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

const BADGE_DOT: Record<AuthorBadge, string> = {
  DOCTOR: "bg-success",
  PARAMEDIC: "bg-accent",
  COMMUNITY: "bg-[var(--knowledge-list-muted)]",
};

export function KnowledgeLibraryPage() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const [category, setCategory] = useState<(typeof ArticleCategory)[number] | null>(null);
  const search = useDebouncedValue(searchInput, 300);

  const { data, isLoading } = useQuery({
    queryKey: ["articles", search, category],
    queryFn: () => knowledgeApi.list(search, category ?? undefined),
  });

  return (
    <AppShell>
      {/* Warm editorial top section */}
      <div className="bg-knowledge-top rounded-b-[2.5rem] pb-7 shadow-elevated">
        <div className="safe-top flex items-center gap-3 px-6 pt-5">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="grid h-10 w-10 place-items-center rounded-full bg-knowledge-card text-knowledge-top"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-serif text-2xl font-bold text-knowledge-top">Knowledge Library</h1>
            <p className="text-xs text-knowledge-top-muted">First aid you can trust, written by clinicians</p>
          </div>
        </div>

        <div className="mt-5 px-6">
          <div className="flex items-center gap-2.5 rounded-full bg-knowledge-card px-4 py-3 shadow-card">
            <Search size={18} className="shrink-0 text-knowledge-top-muted" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={'Search "bleeding", "CPR", "burns"…'}
              className="w-full min-w-0 bg-transparent text-[15px] font-medium text-knowledge-top outline-none placeholder:text-knowledge-top-muted"
            />
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto px-6 pb-1">
          <CategoryPill label="All" active={category === null} onClick={() => setCategory(null)} />
          {ArticleCategory.map((cat) => (
            <CategoryPill key={cat} label={ARTICLE_CATEGORY_LABEL[cat]} active={category === cat} onClick={() => setCategory(cat)} />
          ))}
        </div>

        {data?.featured && (
          <div className="mt-5 px-6">
            <FeaturedCard
              title={data.featured.title}
              summary={data.featured.summary}
              category={data.featured.category}
              authorName={data.featured.author.name}
              badge={data.featured.author.badge}
              readTimeMinutes={data.featured.readTimeMinutes}
              onClick={() => navigate(`/knowledge/${data.featured!.id}`)}
            />
          </div>
        )}
      </div>

      {/* Darker reading-list section */}
      <div className="min-h-[40vh] bg-knowledge-list px-6 pb-8 pt-7">
        <h2 className="font-serif text-lg font-bold text-knowledge-list">
          {category ? ARTICLE_CATEGORY_LABEL[category] : "More Articles"}
        </h2>

        {isLoading && <p className="mt-6 text-sm text-knowledge-list-muted">Loading articles…</p>}

        {!isLoading && (data?.articles.length ?? 0) === 0 && !data?.featured && (
          <div className="mt-10 flex flex-col items-center text-center">
            <div className="grid h-14 w-14 place-items-center rounded-3xl bg-white/5 text-knowledge-list-muted">
              <BookOpen size={24} />
            </div>
            <p className="mt-4 text-sm text-knowledge-list-muted">No articles match your search yet.</p>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3">
          {data?.articles.map((article) => (
            <motion.button
              key={article.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/knowledge/${article.id}`)}
              className="flex w-full items-start gap-3 rounded-3xl bg-knowledge-card p-4 text-left"
            >
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-accent">
                  {ARTICLE_CATEGORY_LABEL[article.category]}
                </span>
                <h3 className="mt-1 font-serif text-base font-bold leading-snug text-knowledge-list">{article.title}</h3>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-knowledge-list-muted">
                  <span className={cn("h-1.5 w-1.5 rounded-full", BADGE_DOT[article.author.badge])} />
                  <span className="font-medium text-knowledge-list">{article.author.name}</span>
                  <span>· {AUTHOR_BADGE_LABEL[article.author.badge]}</span>
                </div>
                <div className="mt-2.5 flex items-center gap-3.5 text-xs text-knowledge-list-muted">
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {article.readTimeMinutes} min read
                  </span>
                  <span className="flex items-center gap-1">
                    <Bookmark size={12} /> {article.saveCount}
                  </span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function CategoryPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
        active ? "border-transparent bg-primary text-white" : "border-knowledge-pill bg-knowledge-pill text-knowledge-top",
      )}
    >
      {label}
    </button>
  );
}

function FeaturedCard({
  title,
  summary,
  category,
  authorName,
  badge,
  readTimeMinutes,
  onClick,
}: {
  title: string;
  summary: string;
  category: (typeof ArticleCategory)[number];
  authorName: string;
  badge: AuthorBadge;
  readTimeMinutes: number;
  onClick: () => void;
}) {
  return (
    <motion.button whileTap={{ scale: 0.98 }} onClick={onClick} className="block w-full text-left">
      <div className="relative overflow-hidden rounded-3xl bg-primary p-6 shadow-glow-primary">
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, white, transparent 70%)" }}
        />
        <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
          Featured · {ARTICLE_CATEGORY_LABEL[category]}
        </span>
        <h3 className="mt-3 font-serif text-xl font-bold leading-snug text-white">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-white/85">{summary}</p>
        <div className="mt-4 flex items-center gap-3 text-xs font-medium text-white/80">
          <span>
            {authorName} · {AUTHOR_BADGE_LABEL[badge]}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} /> {readTimeMinutes} min
          </span>
        </div>
      </div>
    </motion.button>
  );
}
