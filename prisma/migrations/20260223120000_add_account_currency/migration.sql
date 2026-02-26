-- Add currency back to accounts with a sensible default
ALTER TABLE "accounts"
ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'USD';

-- Optional: ensure existing rows get default (Postgres handles via default)

