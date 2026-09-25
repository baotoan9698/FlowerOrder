CREATE TABLE "CashEntry" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "shopId" TEXT NOT NULL,
 "type" TEXT NOT NULL,
 "date" TEXT NOT NULL,
 "title" TEXT NOT NULL,
 "category" TEXT NOT NULL,
 "amount" INTEGER NOT NULL,
 "note" TEXT NOT NULL DEFAULT '',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "CashEntry_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "CashEntry_amount_check" CHECK ("amount" > 0 AND "amount" <= 2000000000),
 CONSTRAINT "CashEntry_type_check" CHECK ("type" IN ('income', 'expense'))
);
CREATE INDEX "CashEntry_shopId_date_idx" ON "CashEntry"("shopId", "date");
