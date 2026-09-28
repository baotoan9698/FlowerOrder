import { test } from "node:test";
import { chromium, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomBytes, createHash } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";

test("Overview pagination sizes, navigation and filter reset", async () => {
  const db = new PrismaClient();
  const browser = await chromium.launch({ headless: true, executablePath: ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(existsSync) });
  let shop;
  try {
    shop = await db.shop.create({ data: { name: "Pagination test", email: `pages-${Date.now()}@example.com`, passwordHash: "unused", accessStatus: "active" } });
    const customer = await db.customer.create({ data: { shopId: shop.id, code: "KH1", name: "Test", phone: "0900000000", address: "", identityKey: "test" } });
    const date = new Date();
    const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-15`;
    await db.order.createMany({ data: Array.from({ length: 55 }, (_, n) => ({ shopId: shop.id, customerId: customer.id, code: `DH${String(n).padStart(4, "0")}`, product: `Flower ${n}`, customer: "Test", phone: "0900000000", address: "", date: day, orderDate: day, time: "09:00", price: 100000 })) });
    const context = await browser.newContext();
    const token = randomBytes(32).toString("hex");
    await db.session.create({ data: { id: createHash("sha256").update(token).digest("hex"), shopId: shop.id, expiresAt: new Date(Date.now() + 600000) } });
    await context.addCookies([{ name: "floralhelp_session", value: token, url: "http://127.0.0.1:3000" }]);
    const page = await context.newPage();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("http://127.0.0.1:3000/");
      const cards = page.locator(".order-list .order-card");
      const nav = page.getByRole("navigation", { name: "Phân trang đơn hàng tổng quan" });
      await expect(cards).toHaveCount(10);
      const firstCode = await cards.first().locator(".order-code-link").textContent();
      await nav.getByRole("button", { name: "Sau", exact: true }).click();
      await expect(nav).toContainText("Trang 2/6");
      await expect(cards.first().locator(".order-code-link")).not.toHaveText(firstCode);
      await nav.getByLabel("Số đơn mỗi trang").selectOption("20");
      await expect(cards).toHaveCount(20);
      await expect(nav).toContainText("Trang 1/3");
      await nav.getByLabel("Số đơn mỗi trang").selectOption("50");
      await expect(cards).toHaveCount(50);
      await nav.getByRole("button", { name: "Sau", exact: true }).click();
      await expect(cards).toHaveCount(5);
      await expect(nav.getByRole("button", { name: "Sau", exact: true })).toBeDisabled();
      await page.getByLabel("Tìm đơn hàng").fill("DH0001");
      await expect(cards).toHaveCount(1);
      await expect(nav).toContainText("Trang 1/1");
      await page.getByLabel("Tìm đơn hàng").fill("");
      await nav.getByLabel("Số đơn mỗi trang").selectOption("10");
      await nav.scrollIntoViewIfNeeded();
      mkdirSync("artifacts", { recursive: true });
      await page.screenshot({ path: `artifacts/pagination-${width}.png` });
      await page.goto("http://127.0.0.1:3000/orders");
      const ordersNav = page.getByRole("navigation", { name: "Phân trang danh sách đơn hàng" });
      const list = page.locator(width > 760 ? ".orders-table" : ".mobile-orders");
      await expect(list.getByRole("checkbox", { name: /^Chọn đơn / })).toHaveCount(10);
      await list.getByRole("checkbox", { name: "Chọn tất cả đơn trên trang này" }).check();
      await expect(page.locator(".order-selection-toolbar")).toContainText("Đã chọn 10 đơn");
      await ordersNav.getByRole("button", { name: "Sau", exact: true }).click();
      await expect(list.getByRole("checkbox", { name: "Chọn tất cả đơn trên trang này" })).not.toBeChecked();
      await list.getByRole("checkbox", { name: /^Chọn đơn / }).first().check();
      await expect(page).toHaveURL(/\/orders$/);
      await expect(page.locator(".order-selection-toolbar")).toContainText("Đã chọn 11 đơn");
      await ordersNav.getByLabel("Số đơn mỗi trang").selectOption("20");
      await expect(list.getByRole("checkbox", { name: /^Chọn đơn / })).toHaveCount(20);
      await expect(list.getByRole("checkbox", { name: "Chọn tất cả đơn trên trang này" })).toHaveJSProperty("indeterminate", true);
      await ordersNav.getByLabel("Số đơn mỗi trang").selectOption("50");
      await expect(list.getByRole("checkbox", { name: /^Chọn đơn / })).toHaveCount(50);
      await page.getByRole("button", { name: "Bỏ chọn tất cả" }).click();
      await expect(page.locator(".order-selection-toolbar")).toContainText("Đã chọn 0 đơn");
      await list.getByRole("checkbox", { name: /^Chọn đơn / }).first().check();
      await page.getByLabel("Tìm đơn hàng").fill("DH0001");
      await expect(page.locator(".order-selection-toolbar")).toContainText("Đã chọn 0 đơn");
    }
  } finally {
    if (shop) { await db.order.deleteMany({ where: { shopId: shop.id } }); await db.customer.deleteMany({ where: { shopId: shop.id } }); await db.shop.delete({ where: { id: shop.id } }); }
    await browser.close(); await db.$disconnect();
  }
});
