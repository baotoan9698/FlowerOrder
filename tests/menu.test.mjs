import { approveFixture } from "./approve-fixture.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { existsSync, mkdirSync } from "node:fs";

test("Left drawer opens, closes, restores focus and navigates on desktop and mobile", { timeout: 90000 }, async () => {
  const db = new PrismaClient();
  const executablePath = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
  const browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage();
  const email = `menu-test-${Date.now()}@example.com`;
  try {
    await page.goto("http://127.0.0.1:3000");
    await page.getByRole("button", { name: "Tạo shop mới", exact: true }).click();
    await page.getByLabel("Tên shop").fill("Shop thử menu");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Mật khẩu").fill("MenuTest12345!");
    await page.getByRole("button", { name: "Tạo shop", exact: true }).click();
      await approveFixture(page, db);
    const toggle = page.getByRole("button", { name: "Mở menu", exact: true });
    const drawer = page.getByRole("dialog", { name: "Menu quản lý shop", exact: true });
    const desktop = page.getByRole("complementary", { name: "Menu PC", exact: true });
    await desktop.waitFor(); mkdirSync("artifacts", { recursive: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(desktop).toHaveCSS("width", "76px");
    await expect(desktop.locator("nav button span").first()).not.toBeVisible();
    await expect(toggle).not.toBeVisible();
    await page.screenshot({ path: "artifacts/menu-pc-collapsed.png", fullPage: true });
    await desktop.getByRole("button", { name: "Mở rộng menu", exact: true }).click();
    await expect(desktop).toHaveCSS("width", "248px");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "expanded desktop overflow");
    await expect(desktop.locator("nav button span").first()).toBeVisible();
    await expect(drawer).not.toBeVisible();
    await page.screenshot({ path: "artifacts/menu-pc-expanded.png", fullPage: true });
    await desktop.getByRole("button", { name: "Danh sách đơn", exact: true }).click();
    await expect(page).toHaveURL("http://127.0.0.1:3000/orders");
    await expect(desktop).toHaveCSS("width", "248px");
    await desktop.getByRole("button", { name: "Thu gọn menu", exact: true }).click();
    await desktop.getByRole("button", { name: "Khách hàng", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Khách hàng", exact: true })).toBeVisible();
    await expect(desktop).toHaveCSS("width", "76px");
    await desktop.getByRole("button", { name: "Cài đặt shop", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Cài đặt shop" })).toBeVisible();
    await page.getByRole("button", { name: "Đóng", exact: true }).click();
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(desktop).not.toBeVisible();
      await expect(drawer).not.toBeVisible();
      await expect(page.locator(".topbar")).not.toContainText("Không gian làm việc");
      await expect(page.locator(".topbar")).not.toContainText("Shop riêng của bạn");
      await toggle.click(); await expect(drawer).toBeVisible();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
      await drawer.screenshot({ path: `artifacts/menu-drawer-${width}.png` });
      const box = await drawer.boundingBox(); assert.ok(Math.abs(box.x) < 1 && box.width < width);
      await page.keyboard.press("Escape"); await expect(drawer).not.toBeVisible(); await expect(toggle).toBeFocused();
      await toggle.click(); await drawer.getByRole("button", { name: "Đóng menu" }).click(); await expect(drawer).not.toBeVisible();
      await toggle.click();
      await page.mouse.click(width - 4, 450); await expect(drawer).not.toBeVisible();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await toggle.click(); await drawer.getByRole("button", { name: "Danh sách đơn", exact: true }).click();
      await expect(drawer).not.toBeVisible(); await expect(page.getByRole("heading", { name: "Danh sách đơn hàng" })).toBeVisible();
      await toggle.click(); await drawer.getByRole("button", { name: "Khách hàng", exact: true }).click();
      await expect(drawer).not.toBeVisible(); await expect(page.getByRole("heading", { name: "Khách hàng", exact: true })).toBeVisible();
      await toggle.click(); await drawer.getByRole("button", { name: "Cài đặt shop", exact: true }).click();
      await expect(drawer).not.toBeVisible(); await expect(page.getByRole("dialog", { name: "Cài đặt shop" })).toBeVisible();
      await page.getByRole("button", { name: "Đóng", exact: true }).click();
    }
  } finally {
    await db.shop.deleteMany({ where: { email } }); await db.authAttempt.deleteMany({ where: { key: email } });
    await browser.close(); await db.$disconnect();
  }
});
