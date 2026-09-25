-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "price" INTEGER NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Product_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "storageDriver" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductImage_productId_shopId_fkey" FOREIGN KEY ("productId", "shopId") REFERENCES "Product" ("id", "shopId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "productId" TEXT,
    "customer" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "orderDate" TEXT NOT NULL DEFAULT '',
    "time" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "paidAmount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Order_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Order_productId_shopId_fkey" FOREIGN KEY ("productId", "shopId") REFERENCES "Product" ("id", "shopId") ON DELETE NO ACTION ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("address", "createdAt", "customer", "date", "id", "note", "orderDate", "paidAmount", "phone", "price", "product", "shopId", "status", "time") SELECT "address", "createdAt", "customer", "date", "id", "note", "orderDate", "paidAmount", "phone", "price", "product", "shopId", "status", "time" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE INDEX "Order_shopId_date_idx" ON "Order"("shopId", "date");
CREATE INDEX "Order_shopId_orderDate_idx" ON "Order"("shopId", "orderDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Product_shopId_archived_idx" ON "Product"("shopId", "archived");

-- CreateIndex
CREATE UNIQUE INDEX "Product_id_shopId_key" ON "Product"("id", "shopId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductImage_storageKey_key" ON "ProductImage"("storageKey");

-- CreateIndex
CREATE INDEX "ProductImage_shopId_idx" ON "ProductImage"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductImage_productId_shopId_slot_key" ON "ProductImage"("productId", "shopId", "slot");
