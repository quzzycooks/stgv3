ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "medical_info_complete" boolean DEFAULT false NOT NULL;
