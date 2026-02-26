ALTER TABLE "transactions"
ADD COLUMN IF NOT EXISTS "counterparty" TEXT;
