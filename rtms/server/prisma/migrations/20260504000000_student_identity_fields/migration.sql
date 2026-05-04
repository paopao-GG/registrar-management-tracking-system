-- Student identity fields: split single `name` column into `lastName`/`firstName`/`middleName`,
-- add unique `studentNumber`, optional `email`. Runs in a single transaction (Prisma default)
-- so the schema is never half-migrated.

-- 1. Additive: nullable columns
ALTER TABLE "Student"
  ADD COLUMN "studentNumber" TEXT,
  ADD COLUMN "lastName" TEXT,
  ADD COLUMN "firstName" TEXT,
  ADD COLUMN "middleName" TEXT,
  ADD COLUMN "email" TEXT;

-- 2. Backfill name parts. Convention from existing rows: "Last, First [Middle...]"
--    Rows lacking a comma → put whole string in lastName, firstName='(unknown)' so NOT NULL holds.
DO $$
DECLARE
  rec RECORD;
  comma_pos INT;
  rest TEXT;
  space_pos INT;
  ln TEXT;
  fn TEXT;
  mn TEXT;
BEGIN
  FOR rec IN SELECT id, name FROM "Student" WHERE "lastName" IS NULL LOOP
    comma_pos := position(',' in rec.name);
    IF comma_pos = 0 THEN
      ln := trim(rec.name);
      fn := '(unknown)';
      mn := NULL;
    ELSE
      ln := trim(substring(rec.name from 1 for comma_pos - 1));
      rest := trim(substring(rec.name from comma_pos + 1));
      space_pos := position(' ' in rest);
      IF space_pos = 0 THEN
        fn := COALESCE(NULLIF(rest, ''), '(unknown)');
        mn := NULL;
      ELSE
        fn := substring(rest from 1 for space_pos - 1);
        mn := NULLIF(trim(substring(rest from space_pos + 1)), '');
      END IF;
    END IF;
    UPDATE "Student"
      SET "lastName" = ln, "firstName" = fn, "middleName" = mn
      WHERE id = rec.id;
  END LOOP;
END $$;

-- 3. Backfill studentNumber for legacy rows. Placeholder format keeps the unique
--    constraint satisfiable while flagging rows that need manual cleanup.
UPDATE "Student"
SET "studentNumber" = 'LEGACY-' || substring(id from 1 for 8)
WHERE "studentNumber" IS NULL;

-- 4. Enforce NOT NULL on the new identity columns
ALTER TABLE "Student"
  ALTER COLUMN "studentNumber" SET NOT NULL,
  ALTER COLUMN "lastName" SET NOT NULL,
  ALTER COLUMN "firstName" SET NOT NULL;

-- 5. Drop the old combined `name` column
DROP INDEX IF EXISTS "Student_name_idx";
ALTER TABLE "Student" DROP COLUMN "name";

-- 6. New indexes / constraints
CREATE UNIQUE INDEX "Student_studentNumber_key" ON "Student"("studentNumber");
CREATE INDEX "Student_lastName_idx" ON "Student"("lastName");
CREATE INDEX "Student_studentNumber_idx" ON "Student"("studentNumber");
