ALTER TABLE "Order" ADD COLUMN "discount" INTEGER NOT NULL DEFAULT 0 CHECK ("discount" >= 0 AND "discount" <= 2000000000);
