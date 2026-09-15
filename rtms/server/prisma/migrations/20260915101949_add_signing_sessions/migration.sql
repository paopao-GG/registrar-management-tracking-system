-- CreateTable
CREATE TABLE "SigningSession" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SigningSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SigningSession_token_key" ON "SigningSession"("token");

-- CreateIndex
CREATE INDEX "SigningSession_transactionId_idx" ON "SigningSession"("transactionId");

-- CreateIndex
CREATE INDEX "SigningSession_status_idx" ON "SigningSession"("status");

-- AddForeignKey
ALTER TABLE "SigningSession" ADD CONSTRAINT "SigningSession_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
