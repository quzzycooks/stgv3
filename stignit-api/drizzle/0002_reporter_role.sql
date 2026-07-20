CREATE TYPE reporter_role_enum AS ENUM ('WITNESS','INVOLVED');
--> statement-breakpoint
ALTER TABLE incidents ADD COLUMN reporter_role reporter_role_enum NOT NULL DEFAULT 'INVOLVED';
