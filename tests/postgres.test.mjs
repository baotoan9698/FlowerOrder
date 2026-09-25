import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

test("PostgreSQL migration: unique accounts, order defaults, foreign keys and cascades", async () => {
  // Runs real PostgreSQL in WASM without cloud credentials or production data.
  const db = new PGlite();
  try {
    await db.exec(
      readFileSync(
        new URL(
          "../prisma/migrations/20260921042104_init/migration.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.query(
      'INSERT INTO "Shop" (id, name, email, "passwordHash") VALUES ($1, $2, $3, $4)',
      ["a", "Shop A", "a@example.com", "test-hash"],
    );
    await db.query(
      'INSERT INTO "Shop" (id, name, email, "passwordHash") VALUES ($1, $2, $3, $4)',
      ["b", "Shop B", "b@example.com", "test-hash"],
    );
    await assert.rejects(
      db.query(
        'INSERT INTO "Shop" (id, name, email, "passwordHash") VALUES ($1, $2, $3, $4)',
        ["duplicate", "Shop Duplicate", "a@example.com", "test-hash"],
      ),
      /unique/i,
    );
    const insert =
      'INSERT INTO "Order" (id, "shopId", product, customer, phone, address, date, time, price) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)';
    const values = [
      "order-a",
      "a",
      "Hoa hồng",
      "Khách hàng",
      "0901234567",
      "TP.HCM",
      "2026-09-21",
      "09:00",
      850000,
    ];
    await db.query(insert, values);
    await db.query('UPDATE "Order" SET "createdAt" = $1 WHERE id = $2', [
      "2026-09-20T18:00:00Z",
      "order-a",
    ]);
    await db.exec(
      readFileSync(
        new URL(
          "../prisma/migrations/20260921070000_order_date/migration.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    assert.equal(
      (
        await db.query('SELECT "orderDate" FROM "Order" WHERE id = $1', [
          "order-a",
        ])
      ).rows[0].orderDate,
      "2026-09-21",
    );
    await db.exec(
      readFileSync(
        new URL(
          "../prisma/migrations/20260921060000_order_payment/migration.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const payment = await db.query(
      'SELECT "paidAmount", price - "paidAmount" AS remaining FROM "Order" WHERE id = $1',
      ["order-a"],
    );
    assert.deepEqual(payment.rows[0], { paidAmount: 0, remaining: 850000 });
    await db.query('UPDATE "Order" SET "paidAmount" = $1 WHERE id = $2', [
      300000,
      "order-a",
    ]);
    assert.equal(
      (
        await db.query(
          'SELECT price - "paidAmount" AS remaining FROM "Order" WHERE id = $1',
          ["order-a"],
        )
      ).rows[0].remaining,
      550000,
    );
    await assert.rejects(
      db.query(insert, ["orphan", "missing", ...values.slice(2)]),
      /foreign key/i,
    );
    const { rows } = await db.query(
      'SELECT status, note, price FROM "Order" WHERE id = $1',
      ["order-a"],
    );
    assert.deepEqual(rows[0], { status: "pending", note: "", price: 850000 });
    const updated = await db.query(
      'UPDATE "Order" SET product = $1 WHERE id = $2 AND "shopId" = $3 RETURNING id',
      ["Cross shop", "order-a", "b"],
    );
    assert.equal(updated.rows.length, 0);
    await db.exec(
      readFileSync(
        new URL(
          "../prisma/migrations/20260922010000_shop_products/migration.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.query(
      'INSERT INTO "Product" (id, "shopId", name, price) VALUES ($1, $2, $3, $4)',
      ["product-a", "a", "Private A", 850000],
    );
    await db.query(
      'INSERT INTO "Product" (id, "shopId", name, price) VALUES ($1, $2, $3, $4)',
      ["product-b", "b", "Private B", 850000],
    );
    await assert.rejects(
      db.query('UPDATE "Order" SET "productId" = $1 WHERE id = $2', [
        "product-b",
        "order-a",
      ]),
      /foreign key/i,
    );
    await db.query('UPDATE "Order" SET "productId" = $1 WHERE id = $2', [
      "product-a",
      "order-a",
    ]);
    const insertImage =
      'INSERT INTO "ProductImage" (id, "shopId", "productId", slot, "storageKey", "storageDriver") VALUES ($1, $2, $3, $4, $5, $6)';
    await assert.rejects(
      db.query(insertImage, ["bad", "b", "product-a", 1, "bad-key", "s3"]),
      /foreign key/i,
    );
    await db.query(insertImage, [
      "good",
      "a",
      "product-a",
      1,
      "good-key",
      "s3",
    ]);
    await assert.rejects(
      db.query(insertImage, [
        "duplicate-slot",
        "a",
        "product-a",
        1,
        "different-key",
        "s3",
      ]),
      /unique/i,
    );
    await db.query(
      'INSERT INTO "Session" (id, "shopId", "expiresAt") VALUES ($1, $2, $3)',
      ["session-a", "a", new Date(Date.now() + 86400000)],
    );
    await db.query(
      'INSERT INTO "AuthAttempt" (key, "resetsAt") VALUES ($1, $2)',
      ["a@example.com", new Date(Date.now() + 60000)],
    );
    await db.exec(readFileSync(new URL("../prisma/migrations/20260923010000_cash_entries/migration.sql", import.meta.url), "utf8"));
    const cashSql = 'INSERT INTO "CashEntry" (id, "shopId", type, date, title, category, amount) VALUES ($1, $2, $3, $4, $5, $6, $7)';
    await db.query(cashSql, ["cash-a", "a", "income", "2026-09-23", "Thu", "Bán hàng", 500000]);
    await assert.rejects(db.query(cashSql, ["negative", "a", "expense", "2026-09-23", "Chi", "Khác", -1]), /check/i);
    await assert.rejects(db.query(cashSql, ["foreign", "missing-shop", "income", "2026-09-23", "Thu", "Khác", 1]), /foreign key/i);
    await db.exec(readFileSync(new URL("../prisma/migrations/20260923020000_customer_codes/migration.sql", import.meta.url), "utf8"));
    const migratedOrder = (await db.query('SELECT code, "customerId" FROM "Order" WHERE id = $1', ["order-a"])).rows[0];
    assert.equal(migratedOrder.code, "DH000001");
    const migratedCustomer = (await db.query('SELECT code FROM "Customer" WHERE id = $1', [migratedOrder.customerId])).rows[0];
    assert.equal(migratedCustomer.code, "KH000001");
    await db.exec(readFileSync(new URL("../prisma/migrations/20260924010000_order_time/migration.sql", import.meta.url), "utf8"));
    assert.equal((await db.query('SELECT "orderTime" FROM "Order" WHERE id = $1', ["order-a"])).rows[0].orderTime, "");
    await db.query('UPDATE "Order" SET "orderTime" = $1 WHERE id = $2', ["14:35", "order-a"]);
    await db.exec(readFileSync(new URL("../prisma/migrations/20260924020000_order_source/migration.sql", import.meta.url), "utf8"));
    assert.equal((await db.query('SELECT source FROM "Order" WHERE id = $1', ["order-a"])).rows[0].source, "");
    await db.query('UPDATE "Order" SET source = $1 WHERE id = $2', ["Facebook", "order-a"]);
    await db.exec(readFileSync(new URL("../prisma/migrations/20260924030000_order_items/migration.sql", import.meta.url), "utf8"));
    const migratedItem = (await db.query('SELECT * FROM "OrderItem" WHERE "orderId" = $1', ["order-a"])).rows[0];
    await db.exec(readFileSync(new URL("../prisma/migrations/20260924040000_customer_profile/migration.sql", import.meta.url), "utf8"));
    assert.equal((await db.query('SELECT email FROM "Customer" WHERE id = $1', [migratedOrder.customerId])).rows[0].email, "");
    assert.equal(migratedItem.quantity, 1);
    await db.exec(readFileSync(new URL("../prisma/migrations/20260925010000_order_history/migration.sql", import.meta.url), "utf8"));
    const auditSql = 'INSERT INTO "OrderHistory" (id, "orderId", "shopId", "actorId", "actorName", "actorEmail", action, changes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)';
    await assert.rejects(db.query(auditSql, ["bad-audit", "order-a", "b", "b", "B", "b@test.com", "updated", "[]"]), /foreign key/i);
    await db.query(auditSql, ["audit-a", "order-a", "a", "a", "A", "a@test.com", "updated", "[]"]);
    await db.query('UPDATE "Order" SET "paidAmount" = 100 WHERE id = $1', ["order-a"]);
    await db.exec(readFileSync(new URL("../prisma/migrations/20260925020000_order_payments/migration.sql", import.meta.url), "utf8"));
    await db.exec(readFileSync(new URL("../prisma/migrations/20260925030000_order_discount/migration.sql", import.meta.url), "utf8"));
    assert.equal((await db.query('SELECT discount FROM "Order" LIMIT 1')).rows[0].discount, 0);
    await assert.rejects(db.exec('UPDATE "Order" SET discount = -1'), /check/i);
    const oldPayment = (await db.query('SELECT amount, method FROM "OrderPayment" WHERE "orderId" = $1', ["order-a"])).rows[0];
    assert.deepEqual(oldPayment, { amount: 100, method: "unknown" });
    assert.equal((await db.query('SELECT "shippingFee" FROM "Order" WHERE id = $1', ["order-a"])).rows[0].shippingFee, 0);
    await assert.rejects(db.query('UPDATE "OrderPayment" SET "shopId" = $1 WHERE "orderId" = $2', ["b", "order-a"]), /foreign key/i);
    await assert.rejects(db.query('UPDATE "OrderPayment" SET amount = -1 WHERE "orderId" = $1', ["order-a"]), /check/i);
    assert.equal(migratedItem.productId, "product-a");
    await assert.rejects(db.query('UPDATE "OrderItem" SET "productId" = $1 WHERE "orderId" = $2', ["product-b", "order-a"]), /foreign key/i);
    await assert.rejects(db.query('UPDATE "OrderItem" SET quantity = 0 WHERE "orderId" = $1', ["order-a"]), /check/i);
    await db.query('INSERT INTO "Customer" (id, "shopId", code, name, phone, address, "identityKey") VALUES ($1,$2,$3,$4,$5,$6,$7)', ["customer-b", "b", "KH000001", "B", "0900000000", "B", "B|0900000000"]);
    await assert.rejects(db.query('UPDATE "Order" SET "customerId" = $1 WHERE id = $2', ["customer-b", "order-a"]), /foreign key/i);
    await db.query('DELETE FROM "Shop" WHERE id = $1', ["a"]);
    assert.equal((await db.query('SELECT * FROM "Customer" WHERE "shopId" = $1', ["a"])).rows.length, 0);
    assert.equal((await db.query('SELECT * FROM "CashEntry"')).rows.length, 0);
    assert.equal((await db.query('SELECT * FROM "Order"')).rows.length, 0);
    assert.equal((await db.query('SELECT * FROM "OrderItem"')).rows.length, 0);
    assert.equal((await db.query('SELECT * FROM "OrderHistory"')).rows.length, 0);
    assert.equal((await db.query('SELECT * FROM "OrderPayment"')).rows.length, 0);
    assert.equal((await db.query('SELECT * FROM "Session"')).rows.length, 0);
    assert.equal((await db.query('SELECT * FROM "Shop"')).rows.length, 1);
    assert.equal(
      (await db.query('SELECT * FROM "ProductImage"')).rows.length,
      0,
    );
    assert.equal(
      (await db.query('SELECT * FROM "Product" WHERE "shopId" = $1', ["b"]))
        .rows.length,
      1,
    );
  } finally {
    await db.close();
  }
});
