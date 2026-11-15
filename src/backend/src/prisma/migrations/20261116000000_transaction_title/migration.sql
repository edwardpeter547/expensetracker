-- Introduce a dedicated, required transaction title.
--
-- Existing rows are backfilled from a trimmed description when one exists,
-- falling back to the deterministic placeholder "Transaction". The column is
-- only made NOT NULL after the backfill so the migration never violates the
-- constraint on populated data.
ALTER TABLE "transaction" ADD COLUMN "title" VARCHAR(120);

UPDATE "transaction"
SET "title" = NULLIF(BTRIM("description"), '')
WHERE "title" IS NULL;

UPDATE "transaction"
SET "title" = 'Transaction'
WHERE "title" IS NULL;

ALTER TABLE "transaction" ALTER COLUMN "title" SET NOT NULL;
