-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "productId" TEXT;

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "price" INTEGER NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "storageDriver" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

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

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_productId_shopId_fkey" FOREIGN KEY ("productId", "shopId") REFERENCES "Product"("id", "shopId") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_shopId_fkey" FOREIGN KEY ("productId", "shopId") REFERENCES "Product"("id", "shopId") ON DELETE CASCADE ON UPDATE CASCADE;
