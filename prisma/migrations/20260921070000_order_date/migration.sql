ALTER TABLE "Order" ADD COLUMN "orderDate" TEXT NOT NULL DEFAULT '';
UPDATE "Order" SET "orderDate" = TO_CHAR("createdAt" + INTERVAL '7 hours', 'YYYY-MM-DD');
CREATE INDEX "Order_shopId_orderDate_idx" ON "Order"("shopId", "orderDate");
