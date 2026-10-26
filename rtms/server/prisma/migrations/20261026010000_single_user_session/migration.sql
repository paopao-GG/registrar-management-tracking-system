-- One device per staff account: the live session id carried in its token,
-- and when that token expires.
ALTER TABLE "User" ADD COLUMN "sessionId" TEXT,
ADD COLUMN "sessionExpiresAt" TIMESTAMP(3);
