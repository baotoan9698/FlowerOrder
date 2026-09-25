ALTER TABLE "Order" ADD COLUMN "orderDate" TEXT NOT NULL DEFAULT '';
UPDATE "Order" SET "orderDate" = CASE
  WHEN typeof("createdAt") IN ('integer', 'real') THEN date("createdAt" / 1000, 'unixepoch', '+7 hours')
  ELSE date("createdAt", '+7 hours') END;
CREATE INDEX "Order_shopId_orderDate_idx" ON "Order"("shopId", "orderDate");
