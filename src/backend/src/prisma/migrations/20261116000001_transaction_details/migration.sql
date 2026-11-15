-- Persist optional merchant metadata, an optional budget link, and manually
-- maintained line items on transactions.

ALTER TABLE "transaction" ADD COLUMN "merchantName" VARCHAR(120);
ALTER TABLE "transaction" ADD COLUMN "merchantAddress" VARCHAR(500);
ALTER TABLE "transaction" ADD COLUMN "merchantPurchaseTime" VARCHAR(5);
ALTER TABLE "transaction" ADD COLUMN "merchantPaymentMethod" VARCHAR(80);
ALTER TABLE "transaction" ADD COLUMN "merchantReference" VARCHAR(120);
ALTER TABLE "transaction" ADD COLUMN "budgetId" TEXT;

CREATE TABLE "transaction_item" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" TEXT NOT NULL,
    "unitPrice" DECIMAL(19, 4) NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_item_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "transaction_budgetId_idx" ON "transaction"("budgetId");
CREATE INDEX "transaction_item_transactionId_idx" ON "transaction_item"("transactionId");

ALTER TABLE "transaction_item" ADD CONSTRAINT "transaction_item_transactionId_fkey"
    FOREIGN KEY ("transactionId") REFERENCES "transaction"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "transaction" ADD CONSTRAINT "transaction_budgetId_fkey"
    FOREIGN KEY ("budgetId") REFERENCES "budget"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
