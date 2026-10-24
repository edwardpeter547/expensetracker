-- Convert monetary columns to exact NUMERIC storage. Historical float values
-- are rounded to four decimal places at migration time; applications with
-- amounts beyond that precision should audit before applying.
ALTER TABLE "budget" ALTER COLUMN "amount" TYPE DECIMAL(19, 4) USING ROUND("amount"::numeric, 4);
ALTER TABLE "transaction" ALTER COLUMN "amount" TYPE DECIMAL(19, 4) USING ROUND("amount"::numeric, 4);

-- Historical currency is ambiguous. These columns stay nullable until a
-- reliable source can reconcile them; the application never invents a
-- currency for existing rows.
ALTER TABLE "budget" ADD COLUMN "currency" TEXT;
ALTER TABLE "transaction" ADD COLUMN "currency" TEXT;

-- Add the transaction-to-category reference. It stays nullable until
-- historical category names have been safely reconciled.
ALTER TABLE "transaction" ADD COLUMN "categoryId" TEXT;
CREATE INDEX "transaction_categoryId_idx" ON "transaction"("categoryId");

-- Seed stable system categories. IDs are stable keys, independent of the
-- display label shown in the mobile client.
INSERT INTO "categories" ("id", "name", "icon", "isSystem", "userId") VALUES
    ('sys.salary', 'Salary', 'cash-outline', true, NULL),
    ('sys.investment', 'Investment', 'trending-up', true, NULL),
    ('sys.freelancing', 'Freelancing', 'briefcase-outline', true, NULL),
    ('sys.gifts', 'Gifts', 'gift-outline', true, NULL),
    ('sys.bonus', 'Bonus', 'star-outline', true, NULL),
    ('sys.food', 'Food', 'restaurant-outline', true, NULL),
    ('sys.transport', 'Transport', 'car-outline', true, NULL),
    ('sys.shopping', 'Shopping', 'cart-outline', true, NULL),
    ('sys.bills', 'Bills', 'receipt-outline', true, NULL),
    ('sys.entertainment', 'Entertainment', 'game-controller-outline', true, NULL),
    ('sys.health', 'Health', 'heart-outline', true, NULL)
ON CONFLICT ("id") DO NOTHING;

-- Safely backfill a categoryId only when exactly one system or user-owned
-- category matches the historical category name. Ambiguous names stay NULL.
WITH "candidates" AS (
    SELECT
        t."id" AS "transaction_id",
        c."id" AS "category_id",
        COUNT(*) OVER (PARTITION BY t."id") AS "match_count"
    FROM "transaction" AS t
    JOIN "categories" AS c
        ON LOWER(t."category") = LOWER(c."name")
       AND (c."userId" = t."userId" OR c."isSystem" = true)
    WHERE t."categoryId" IS NULL
)
UPDATE "transaction" AS t
SET "categoryId" = c."category_id"
FROM "candidates" AS c
WHERE t."id" = c."transaction_id"
  AND c."match_count" = 1;

-- Category deletion must never silently remove financial records.
ALTER TABLE "budget" DROP CONSTRAINT "budget_categoryId_fkey";
ALTER TABLE "budget" ADD CONSTRAINT "budget_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "categories"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "transaction" ADD CONSTRAINT "transaction_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "categories"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
