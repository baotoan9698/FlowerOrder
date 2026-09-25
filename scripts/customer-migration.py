from pathlib import Path

for root, pg in [('prisma', True), ('legacy/sqlite', False)]:
    identity = "trim(\"customer\") || '|' || replace(replace(replace(replace(trim(\"phone\"), ' ', ''), '(', ''), ')', ''), '-', '')"
    number = "lpad(n::text, 6, '0')" if pg else "printf('%06d', n)"
    timestamp = 'TIMESTAMP(3)' if pg else 'DATETIME'
    sql = f'''ALTER TABLE "Shop" ADD COLUMN "orderSequence" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Shop" ADD COLUMN "customerSequence" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE "Customer" (
 "id" TEXT NOT NULL PRIMARY KEY, "shopId" TEXT NOT NULL,
 "code" TEXT NOT NULL, "name" TEXT NOT NULL, "phone" TEXT NOT NULL,
 "address" TEXT NOT NULL, "identityKey" TEXT NOT NULL,
 "createdAt" {timestamp} NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "Customer_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Customer_id_shopId_key" ON "Customer"("id", "shopId");
CREATE UNIQUE INDEX "Customer_shopId_code_key" ON "Customer"("shopId", "code");
CREATE UNIQUE INDEX "Customer_shopId_identityKey_key" ON "Customer"("shopId", "identityKey");
WITH grouped AS (
 SELECT "shopId", {identity} AS identity_key, min(id) AS first_id,
 min("customer") AS name, min("phone") AS phone, min("address") AS address
 FROM "Order" GROUP BY "shopId", {identity}
), numbered AS (
 SELECT *, row_number() OVER (PARTITION BY "shopId" ORDER BY first_id) AS n FROM grouped
)
INSERT INTO "Customer" (id, "shopId", code, name, phone, address, "identityKey")
SELECT 'customer-' || first_id, "shopId", 'KH' || {number}, name, phone, address, identity_key FROM numbered;
ALTER TABLE "Order" ADD COLUMN "code" TEXT;
ALTER TABLE "Order" ADD COLUMN "customerId" TEXT;
WITH numbered AS (SELECT id, row_number() OVER (PARTITION BY "shopId" ORDER BY "createdAt", id) AS n FROM "Order")
UPDATE "Order" SET code = (SELECT 'DH' || {number} FROM numbered WHERE numbered.id = "Order".id);
UPDATE "Order" SET "customerId" = (SELECT id FROM "Customer" WHERE "Customer"."shopId" = "Order"."shopId" AND "Customer"."identityKey" = {identity.replace('"customer"', '"Order"."customer"').replace('"phone"', '"Order"."phone"')});
UPDATE "Shop" SET "orderSequence" = (SELECT count(*) FROM "Order" WHERE "shopId" = "Shop".id),
 "customerSequence" = (SELECT count(*) FROM "Customer" WHERE "shopId" = "Shop".id);
'''
    if pg:
        sql += '''ALTER TABLE "Order" ALTER COLUMN code SET NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "customerId" SET NOT NULL;
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_shopId_fkey" FOREIGN KEY ("customerId", "shopId") REFERENCES "Customer"(id, "shopId") ON DELETE NO ACTION ON UPDATE CASCADE;
'''
    else:
        sql = 'PRAGMA foreign_keys=OFF;\n' + sql
        sql += '''CREATE TABLE "new_Order" (
 "id" TEXT NOT NULL PRIMARY KEY, "shopId" TEXT NOT NULL, "code" TEXT NOT NULL,
 "customerId" TEXT NOT NULL, "product" TEXT NOT NULL, "productId" TEXT,
 "customer" TEXT NOT NULL, "phone" TEXT NOT NULL, "address" TEXT NOT NULL,
 "date" TEXT NOT NULL, "orderDate" TEXT NOT NULL DEFAULT '', "time" TEXT NOT NULL,
 "price" INTEGER NOT NULL, "paidAmount" INTEGER NOT NULL DEFAULT 0,
 "status" TEXT NOT NULL DEFAULT 'pending', "note" TEXT NOT NULL DEFAULT '',
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "Order_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"(id) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "Order_productId_shopId_fkey" FOREIGN KEY ("productId", "shopId") REFERENCES "Product"(id, "shopId") ON DELETE NO ACTION ON UPDATE CASCADE,
 CONSTRAINT "Order_customerId_shopId_fkey" FOREIGN KEY ("customerId", "shopId") REFERENCES "Customer"(id, "shopId") ON DELETE NO ACTION ON UPDATE CASCADE
);
INSERT INTO "new_Order" SELECT id, "shopId", code, "customerId", product, "productId", customer, phone, address, date, "orderDate", time, price, "paidAmount", status, note, "createdAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE INDEX "Order_shopId_date_idx" ON "Order"("shopId", date);
CREATE INDEX "Order_shopId_orderDate_idx" ON "Order"("shopId", "orderDate");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
'''
    sql += '''CREATE UNIQUE INDEX "Order_shopId_code_key" ON "Order"("shopId", code);
CREATE INDEX "Order_shopId_customerId_idx" ON "Order"("shopId", "customerId");
'''
    p = Path(root) / 'migrations/20260923020000_customer_codes/migration.sql'
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(sql, encoding='utf-8')
