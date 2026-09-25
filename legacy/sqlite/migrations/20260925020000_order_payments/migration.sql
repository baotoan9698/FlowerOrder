ALTER TABLE "Order" ADD COLUMN "shippingFee" INTEGER NOT NULL DEFAULT 0 CHECK ("shippingFee" BETWEEN 0 AND 2000000000);
CREATE TABLE "OrderPayment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL CHECK ("amount" BETWEEN 1 AND 2000000000),
  "method" TEXT NOT NULL CHECK ("method" IN ('cash', 'transfer', 'unknown')),
  "position" INTEGER NOT NULL,
  CONSTRAINT "OrderPayment_orderId_shopId_fkey" FOREIGN KEY ("orderId", "shopId") REFERENCES "Order"("id", "shopId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "OrderPayment_orderId_shopId_idx" ON "OrderPayment"("orderId", "shopId");
INSERT INTO "OrderPayment" ("id", "orderId", "shopId", "amount", "method", "position")
SELECT "id" || '_payment_0', "id", "shopId", "paidAmount", 'unknown', 0 FROM "Order" WHERE "paidAmount" > 0;
