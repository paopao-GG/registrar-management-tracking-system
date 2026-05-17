-- AlterTable: change default status from Processing to Pending
ALTER TABLE "Transaction" ALTER COLUMN "status" SET DEFAULT 'Pending';

-- Backfill: rename legacy 'Signed' rows to 'Ready for Release'
UPDATE "Transaction" SET "status" = 'Ready for Release' WHERE "status" = 'Signed';
