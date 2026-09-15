/*
  Warnings:

  - Added the required column `releasedTo` to the `SigningSession` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SigningSession" ADD COLUMN     "liveSignature" TEXT,
ADD COLUMN     "releasedTo" TEXT NOT NULL;
