CREATE TABLE "OrderHistory" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "actorName" TEXT NOT NULL,
  "actorEmail" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "changes" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderHistory_orderId_shopId_fkey" FOREIGN KEY ("orderId", "shopId") REFERENCES "Order"("id", "shopId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "OrderHistory_orderId_shopId_createdAt_idx" ON "OrderHistory"("orderId", "shopId", "createdAt");
