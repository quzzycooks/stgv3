CREATE TYPE article_category_enum AS ENUM ('CPR','BLEEDING','BURNS','ROAD_CRASH','FIRE','CHILD');
--> statement-breakpoint
CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  summary VARCHAR(300) NOT NULL,
  content TEXT NOT NULL,
  category article_category_enum NOT NULL,
  author_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_time_minutes INTEGER NOT NULL DEFAULT 3,
  save_count INTEGER NOT NULL DEFAULT 0,
  featured BOOLEAN NOT NULL DEFAULT false,
  reviewed BOOLEAN NOT NULL DEFAULT false,
  reviewed_by_admin_id UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX ix_articles_category ON articles (category);
--> statement-breakpoint
CREATE INDEX ix_articles_author ON articles (author_user_id);
--> statement-breakpoint
CREATE INDEX ix_articles_featured ON articles (featured) WHERE featured = true;
--> statement-breakpoint
CREATE TABLE article_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX ux_as_article_user ON article_saves (article_id, user_id);
--> statement-breakpoint
CREATE INDEX ix_as_user ON article_saves (user_id);
--> statement-breakpoint
CREATE TABLE article_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content VARCHAR(1000) NOT NULL,
  flagged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX ix_ac_article ON article_comments (article_id, created_at);
--> statement-breakpoint
CREATE INDEX ix_ac_flagged ON article_comments (flagged) WHERE flagged = true;
