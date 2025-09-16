-- Create enum if missing (idempotent)
DO $$ BEGIN
  CREATE TYPE "SavedKind" AS ENUM ('POSTS', 'PEOPLE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add column as NULLABLE first (idempotent)
ALTER TABLE "SavedList" ADD COLUMN IF NOT EXISTS "kind" "SavedKind";

-- Backfill existing rows (default them to POSTS)
UPDATE "SavedList" SET "kind" = 'POSTS' WHERE "kind" IS NULL;

-- Now make it required + default
ALTER TABLE "SavedList" ALTER COLUMN "kind" SET NOT NULL;
ALTER TABLE "SavedList" ALTER COLUMN "kind" SET DEFAULT 'POSTS';

-- Helpful index (safe on re-run)
DO $$ BEGIN
  CREATE INDEX "SavedList_userId_kind_idx" ON "SavedList"("userId","kind");
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;
