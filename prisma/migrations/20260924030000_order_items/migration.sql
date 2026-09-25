CREATE UNIQUE INDEX "Order_id_shopId_key" ON "Order"("id", "shopId");
CREATE TABLE "OrderItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "productId" TEXT,
  "name" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL CHECK ("quantity" BETWEEN 1 AND 9999),
  "unitPrice" INTEGER NOT NULL CHECK ("unitPrice" BETWEEN 0 AND 2000000000),
  "position" INTEGER NOT NULL,
  CONSTRAINT "OrderItem_order_fkey" FOREIGN KEY ("orderId", "shopId") REFERENCES "Order"("id", "shopId") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrderItem_product_fkey" FOREIGN KEY ("productId", "shopId") REFERENCES "Product"("id", "shopId") ON DELETE NO ACTION ON UPDATE CASCADE
);
CREATE INDEX "OrderItem_orderId_shopId_idx" ON "OrderItem"("orderId", "shopId");
CREATE INDEX "OrderItem_productId_shopId_idx" ON "OrderItem"("productId", "shopId");
INSERT INTO "OrderItem" ("id", "orderId", "shopId", "productId", "name", "quantity", "unitPrice", "position")
SELECT "id" || '_item_0', "id", "shopId", "productId", "product", 1, "price", 0 FROM "Order";
