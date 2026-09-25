import { PrismaClient } from "@prisma/client";
import { resolve } from "node:path";

// Explicit local shop selection; never choose a tenant implicitly.
const email = process.argv[2];
if (!email) throw new Error("Pass the existing local shop email as the argument.");
const db = new PrismaClient({ datasourceUrl: `file:${resolve("prisma/dev.db").replaceAll("\\", "/")}` });
const count = Number(process.argv[3] ?? 20);
if (![10, 20].includes(count)) throw new Error("Sample count must be 10 or 20");
const batch = count === 10 ? "sample-orders-20260924-ten-v1" : "sample-orders-20260923-v1";
try {
  const shop = await db.shop.findUniqueOrThrow({ where: { email } });
  const products = await db.product.findMany({ where: { shopId: shop.id, archived: false }, orderBy: { createdAt: "asc" } });
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  function date(offset) {
    const value = new Date(`${today}T00:00:00Z`);
    value.setUTCDate(value.getUTCDate() + offset);
    return value.toISOString().slice(0, 10);
  }
  const placed = count === 10 ? [-8, -7, -6, -5, -4, -3, -2, -1, 0, 0] : [-35, -29, -22, -20, -17, -14, -12, -10, -8, -7, -6, -5, -4, -3, -2, -1, 0, 0, 0, 0];
  const delivery = count === 10 ? [-5, -4, -2, -1, 0, 0, 1, 2, 4, 7] : [-29, -24, -18, -14, -10, -7, -4, -2, 0, 0, 1, 2, 3, 4, 5, 7, 9, 12, 15, 20];
  const names = ["Bó hồng pastel", "Giỏ hướng dương", "Bó tulip hồng", "Hộp hoa sinh nhật", "Bó baby trắng", "Giỏ hoa khai trương", "Bó cẩm tú cầu", "Lẵng hoa chúc mừng"];
  const prices = [350000, 450000, 650000, 850000, 280000, 1200000, 550000, 1500000];
  const times = ["08:00", "09:30", "10:00", "11:30", "14:00", "15:30", "17:00", "18:30"];
  const occasions = ["Sinh nhật", "Kỷ niệm", "Khai trương", "Chúc mừng", "Cảm ơn"];
  const rows = placed.map((offset, i) => {
    const product = products.length ? products[i % products.length] : null;
    const price = product?.price ?? prices[i % prices.length];
    const status = delivery[i] < 0 ? "done" : delivery[i] === 0 ? (i % 2 ? "preparing" : "delivering") : delivery[i] <= 3 ? "preparing" : "pending";
    const paidAmount = status === "done" || i % 4 === 0 ? price : i % 3 === 0 ? 0 : Math.floor(price / 2);
    return {
      id: `${batch}-${shop.id}-${String(i + 1).padStart(2, "0")}`,
      shopId: shop.id,
      product: product?.name ?? names[i % names.length],
      productId: product?.id ?? null,
      customer: `${count === 10 ? "[Mẫu 24/09]" : "[Mẫu]"} Khách ${String(i + 1).padStart(2, "0")}`,
      phone: "0000000000",
      address: `Địa chỉ mẫu ${i + 1}, không dùng giao hàng thực tế`,
      orderDate: date(offset),
      orderTime: ["08:15", "09:20", "10:45", "11:10", "13:30", "14:25", "15:40", "16:05", "08:50", "10:10"][i % 10],
      date: date(delivery[i]),
      time: times[i % times.length],
      price, paidAmount, status,
      note: `[ĐƠN MẪU] ${occasions[i % occasions.length]} — dữ liệu thử lịch và báo cáo; không liên hệ/giao hàng. Batch: ${batch}`,
    };
  });
  const result = await db.$transaction(async (tx) => {
    const existing = await tx.order.count({ where: { shopId: shop.id, id: { in: rows.map((row) => row.id) } } });
    if (existing && existing !== rows.length) throw new Error("Partial sample batch exists; inspect before retrying.");
    if (!existing) for (const row of rows) {
      const identityKey = `${row.customer.trim()}|${row.phone.replace(/[ ()-]/g, "")}`;
      let customer = await tx.customer.findUnique({ where: { shopId_identityKey: { shopId: shop.id, identityKey } } });
      if (!customer) {
        const counter = await tx.shop.update({ where: { id: shop.id }, data: { customerSequence: { increment: 1 } } });
        customer = await tx.customer.create({ data: { shopId: shop.id, code: `KH${String(counter.customerSequence).padStart(6, "0")}`, name: row.customer, phone: row.phone, address: row.address, identityKey } });
      }
      const counter = await tx.shop.update({ where: { id: shop.id }, data: { orderSequence: { increment: 1 } } });
      await tx.order.create({ data: { ...row, customerId: customer.id, code: `DH${String(counter.orderSequence).padStart(6, "0")}` } });
    }
    const saved = await tx.order.findMany({ where: { shopId: shop.id, id: { in: rows.map((row) => row.id) } } });
    if (saved.length !== count || saved.some((row) => row.orderDate > row.date || row.paidAmount > row.price || !row.orderTime)) throw new Error("Sample verification failed.");
    return { shop: shop.name, count: saved.length, newlyCreated: !existing, placedRange: [saved.map((o) => o.orderDate).sort()[0], saved.map((o) => o.orderDate).sort().at(-1)], deliveryRange: [saved.map((o) => o.date).sort()[0], saved.map((o) => o.date).sort().at(-1)], distinctPlacedDays: new Set(saved.map((o) => o.orderDate)).size, distinctDeliveryDays: new Set(saved.map((o) => o.date)).size };
  });
  console.log(JSON.stringify(result));
} finally { await db.$disconnect(); }
