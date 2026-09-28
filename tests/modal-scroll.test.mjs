import { test } from "node:test";
import { chromium, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomBytes, createHash } from "node:crypto";
import { existsSync } from "node:fs";

test("Order dialog stays open when clicking its padding or dragging from inside", async () => {
  const db = new PrismaClient();
  const browser = await chromium.launch({ headless: true, executablePath: ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(existsSync) });
  let shop;
  try {
    shop = await db.shop.create({ data: { name: "Scroll test", email: `scroll-${Date.now()}@example.com`, passwordHash: "unused", accessStatus: "active" } });
    const context = await browser.newContext();
    const token = randomBytes(32).toString("hex");
    await db.session.create({ data: { id: createHash("sha256").update(token).digest("hex"), shopId: shop.id, expiresAt: new Date(Date.now() + 600000) } });
    await context.addCookies([{ name: "floralhelp_session", value: token, url: "http://127.0.0.1:3000" }]);
    const page = await context.newPage();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("http://127.0.0.1:3000/orders");
      await page.getByRole("button", { name: /Tạo đơn|Thêm đơn/ }).first().click();
      const modal = page.locator("dialog.order-modal");
      const note = modal.locator('textarea[name="note"]');
      await note.fill("Keep this draft");
      const bounds = await modal.boundingBox();
      const x = bounds.x + bounds.width - 4;
      const y = bounds.y + bounds.height / 2;
      await page.mouse.click(x, y);
      await expect(modal).toBeVisible();
      await expect(note).toHaveValue("Keep this draft");
      await page.mouse.move(x, y); await page.mouse.down();
      await page.mouse.move(width - 1, y + 30); await page.mouse.up();
      await expect(modal).toBeVisible();
      await page.mouse.move(x, y); await page.mouse.wheel(0, 300);
      await expect(modal).toBeVisible();
      await page.mouse.click(1, 1);
      await expect(modal).toHaveCount(0);
    }
  } finally {
    if (shop) await db.shop.delete({ where: { id: shop.id } });
    await browser.close(); await db.$disconnect();
  }
});
