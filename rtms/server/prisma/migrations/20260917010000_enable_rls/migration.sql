-- Block Supabase's public Data API (anon/authenticated roles) from these
-- tables. No policies are added, so only the table owner (the app's
-- Prisma connection) can read or write them.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Student" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SigningSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TabletLock" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
