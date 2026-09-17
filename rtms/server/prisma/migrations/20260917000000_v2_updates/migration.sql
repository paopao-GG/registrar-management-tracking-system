-- Rename CMC to GMC, keeping existing counts.
ALTER TABLE "Transaction" RENAME COLUMN "docCMC" TO "docGMC";

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "sex" TEXT,
ADD COLUMN     "contactNumber" TEXT,
ADD COLUMN     "isAlumni" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastActiveAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SigningSession" ADD COLUMN     "transactionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "consentAt" TIMESTAMP(3);

-- Backfill existing sessions with their single transaction.
UPDATE "SigningSession" SET "transactionIds" = ARRAY["transactionId"];

-- CreateTable
CREATE TABLE "TabletLock" (
    "id" TEXT NOT NULL DEFAULT 'tablet',
    "deviceId" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TabletLock_pkey" PRIMARY KEY ("id")
);
