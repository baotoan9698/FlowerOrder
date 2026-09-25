ALTER TABLE "Shop" ADD COLUMN "orderSequence" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Shop" ADD COLUMN "customerSequence" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE "Customer" (
 "id" TEXT NOT NULL PRIMARY KEY, "shopId" TEXT NOT NULL,
 "code" TEXT NOT NULL, "name" TEXT NOT NULL, "phone" TEXT NOT NULL,
 "address" TEXT NOT NULL, "identityKey" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "Customer_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Customer_id_shopId_key" ON "Customer"("id", "shopId");
CREATE UNIQUE INDEX "Customer_shopId_code_key" ON "Customer"("shopId", "code");
CREATE UNIQUE INDEX "Customer_shopId_identityKey_key" ON "Customer"("shopId", "identityKey");
WITH grouped AS (
 SELECT "shopId", trim("customer") || '|' || replace(replace(replace(replace(trim("phone"), ' ', ''), '(', ''), ')', ''), '-', '') AS identity_key, min(id) AS first_id,
 min("customer") AS name, min("phone") AS phone, min("address") AS address
 FROM "Order" GROUP BY "shopId", trim("customer") || '|' || replace(replace(replace(replace(trim("phone"), ' ', ''), '(', ''), ')', ''), '-', '')
), numbered AS (
 SELECT *, row_number() OVER (PARTITION BY "shopId" ORDER BY first_id) AS n FROM grouped
)
INSERT INTO "Customer" (id, "shopId", code, name, phone, address, "identityKey")
SELECT 'customer-' || first_id, "shopId", 'KH' || lpad(n::text, 6, '0'), name, phone, address, identity_key FROM numbered;
ALTER TABLE "Order" ADD COLUMN "code" TEXT;
ALTER TABLE "Order" ADD COLUMN "customerId" TEXT;
WITH numbered AS (SELECT id, row_number() OVER (PARTITION BY "shopId" ORDER BY "createdAt", id) AS n FROM "Order")
UPDATE "Order" SET code = (SELECT 'DH' || lpad(n::text, 6, '0') FROM numbered WHERE numbered.id = "Order".id);
UPDATE "Order" SET "customerId" = (SELECT id FROM "Customer" WHERE "Customer"."shopId" = "Order"."shopId" AND "Customer"."identityKey" = trim("Order"."customer") || '|' || replace(replace(replace(replace(trim("Order"."phone"), ' ', ''), '(', ''), ')', ''), '-', ''));
UPDATE "Shop" SET "orderSequence" = (SELECT count(*) FROM "Order" WHERE "shopId" = "Shop".id),
 "customerSequence" = (SELECT count(*) FROM "Customer" WHERE "shopId" = "Shop".id);
ALTER TABLE "Order" ALTER COLUMN code SET NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "customerId" SET NOT NULL;
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_shopId_fkey" FOREIGN KEY ("customerId", "shopId") REFERENCES "Customer"(id, "shopId") ON DELETE NO ACTION ON UPDATE CASCADE;
CREATE UNIQUE INDEX "Order_shopId_code_key" ON "Order"("shopId", code);
CREATE INDEX "Order_shopId_customerId_idx" ON "Order"("shopId", "customerId");
