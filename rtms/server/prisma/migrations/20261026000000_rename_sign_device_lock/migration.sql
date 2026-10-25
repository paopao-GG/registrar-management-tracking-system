-- Rename the lock table and preserve the existing sign-device record.
ALTER TABLE "TabletLock" RENAME TO "SignDeviceLock";

ALTER TABLE "SignDeviceLock"
  RENAME CONSTRAINT "TabletLock_pkey" TO "SignDeviceLock_pkey";

ALTER TABLE "SignDeviceLock"
  ALTER COLUMN "id" SET DEFAULT 'sign-device';

DELETE FROM "SignDeviceLock"
WHERE "id" = 'tablet'
  AND EXISTS (
    SELECT 1
    FROM "SignDeviceLock"
    WHERE "id" = 'sign-device'
  );

UPDATE "SignDeviceLock"
SET "id" = 'sign-device'
WHERE "id" = 'tablet'
  AND NOT EXISTS (
    SELECT 1
    FROM "SignDeviceLock"
    WHERE "id" = 'sign-device'
  );
