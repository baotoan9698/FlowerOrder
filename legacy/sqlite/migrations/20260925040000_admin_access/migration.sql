ALTER TABLE "Shop" ADD COLUMN "accessStatus" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "Shop" ADD COLUMN "accessUntil" DATETIME;
UPDATE "Shop" SET "accessStatus" = 'active';
CREATE TABLE "Admin" ("id" TEXT NOT NULL PRIMARY KEY, "email" TEXT NOT NULL, "name" TEXT NOT NULL, "passwordHash" TEXT NOT NULL);
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");
CREATE TABLE "AdminSession" ("id" TEXT NOT NULL PRIMARY KEY, "adminId" TEXT NOT NULL, "expiresAt" DATETIME NOT NULL, FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE);
CREATE INDEX "AdminSession_adminId_idx" ON "AdminSession"("adminId");
CREATE TABLE "AdminEvent" ("id" TEXT NOT NULL PRIMARY KEY, "adminId" TEXT NOT NULL, "shopId" TEXT NOT NULL, "details" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY ("adminId") REFERENCES "Admin"("id"), FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE);
CREATE INDEX "AdminEvent_shopId_createdAt_idx" ON "AdminEvent"("shopId", "createdAt");
