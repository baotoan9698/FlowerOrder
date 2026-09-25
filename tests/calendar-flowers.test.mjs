import { test } from "node:test";
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { existsSync, mkdirSync } from "node:fs";

test("Calendar fits 20 flowers on desktop and mobile, caps markers but retains all orders", { timeout: 90000 }, async () => {
  const db = new PrismaClient();
  const executablePath = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
  const browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage();
  const email = `calendar-flowers-${Date.now()}@example.com`;
  try {
    await page.goto("http://127.0.0.1:3000");
    await page.evaluate(() => document.fonts.ready);
    mkdirSync("artifacts", { recursive: true });
    await page.screenshot({ path: "artifacts/cartoon-login.png", fullPage: true });
    await page.getByRole("button", { name: "Tạo shop mới", exact: true }).click();
    await page.getByLabel("Tên shop").fill("Thử lịch 20 bông hoa");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Mật khẩu").fill("CalendarFlowers123!");
    await page.getByRole("button", { name: "Tạo shop", exact: true }).click();
    await page.getByRole("button", { name: "Tạo đơn hàng", exact: true }).waitFor();
    const shop = await db.shop.findUniqueOrThrow({ where: { email } });
    const customer = await db.customer.create({ data: { shopId: shop.id, code: "KH000001", name: "Khách thử", phone: "0000000000", address: "Địa chỉ thử", identityKey: "calendar-test" } });
    const now = new Date();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    await db.order.createMany({ data: Array.from({ length: 45 }, (_, i) => ({
      shopId: shop.id, customerId: customer.id, code: `DH${String(i + 1).padStart(6, "0")}`, product: `Hoa thử ${i + 1}`, customer: customer.name, phone: customer.phone, address: customer.address, date: `${prefix}-${i < 20 ? "15" : "16"}`, orderDate: `${prefix}-01`, time: "09:00", price: 300000, paidAmount: 100000, status: "pending", note: "Dữ liệu kiểm thử tạm",
    })) });
    await page.reload();
    const day20 = page.getByRole("button", { name: `15/${now.getMonth() + 1}, 20 đơn hàng`, exact: true });
    const day25 = page.getByRole("button", { name: `16/${now.getMonth() + 1}, 25 đơn hàng`, exact: true });
    await expect(day20.locator(".calendar-flowers svg")).toHaveCount(20);
    await expect(day25.locator(".calendar-flowers svg")).toHaveCount(20);
    await expect(day25.locator(".day-count")).toHaveText("25 đơn");
    mkdirSync("artifacts", { recursive: true });
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => document.fonts.ready);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Page overflow at ${width}`);
      const fit = await day20.evaluate((day) => {
        const box = day.getBoundingClientRect();
        const count = day.querySelector(".day-count").getBoundingClientRect();
        return [...day.querySelectorAll(".calendar-flowers svg")].every((flower) => {
          const r = flower.getBoundingClientRect();
          return r.left >= box.left && r.right <= box.right && r.top >= count.bottom && r.bottom <= box.bottom;
        });
      });
      assert.ok(fit, `Flowers overflow or overlap label at ${width}`);
      await page.locator(".calendar.card").screenshot({ path: `artifacts/calendar-20-flowers-${width}.png` });
      if (width === 1440 || width === 390) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: `artifacts/cartoon-overview-${width}.png` });
      }
    }
    await day20.click();
    await expect(page.locator(".order-card")).toHaveCount(20);
    await day25.click();
    await expect(page.locator(".order-card")).toHaveCount(25);
  } finally {
    await db.shop.deleteMany({ where: { email } });
    await db.authAttempt.deleteMany({ where: { key: email } });
    await browser.close(); await db.$disconnect();
  }
});
