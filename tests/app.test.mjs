import { approveFixture } from "./approve-fixture.mjs";
import { navigate } from "./navigation.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { existsSync, mkdirSync } from "node:fs";

test(
  "Shop isolation, authentication, order lifecycle and responsive layout",
  { timeout: 120000 },
  async () => {
    const executablePath =
      process.env.BROWSER_PATH ||
      [
        "C:/Program Files/Google/Chrome/Application/chrome.exe",
        "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
      ].find(existsSync);
    const browser = await chromium.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {}),
    });
    const db = new PrismaClient();
    const run = Date.now();
    const emails = [`test-a-${run}@example.com`, `test-b-${run}@example.com`];
    const contextA = await browser.newContext({
      viewport: { width: 1440, height: 1100 },
    });
    const contextB = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const a = await contextA.newPage();
    const b = await contextB.newPage();
    const base = process.env.TEST_URL || "http://127.0.0.1:3000";
    const date = new Date();
    const dateValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    async function register(page, email, name) {
      await page.goto(base);
      await page
        .getByRole("button", { name: "Tạo shop mới", exact: true })
        .click();
      await page.getByLabel("Tên shop").fill(name);
      await page.getByLabel("Email", { exact: true }).fill(email);
      await page.getByLabel("Mật khẩu").fill("FlowerTest123!");
      await page.getByRole("button", { name: "Tạo shop", exact: true }).click();
      await approveFixture(page, db);
      await page
        .getByRole("button", { name: "Tạo đơn hàng", exact: true })
        .waitFor();
    }
    async function fillOrder(page, name) {
      await page.getByRole("combobox", { name: "Sản phẩm", exact: true }).fill(name);
      await page.getByRole("combobox", { name: "Khách hàng", exact: true }).fill("Khách thử nghiệm");
      await page.getByLabel("Số điện thoại").fill("0901234567");
      await page.getByLabel("Địa chỉ").fill("12 Nguyễn Huệ, TP.HCM");
      await page.getByLabel("Ngày giao").fill(dateValue);
      await page.getByLabel("Giờ giao").fill("09:30");
      const priceInput = page.getByLabel("Đơn giá (₫)", { exact: true });
      await priceInput.fill("");
      await priceInput.pressSequentially("1000000");
      assert.equal(await priceInput.inputValue(), "1.000.000");
      await priceInput.evaluate((el) => el.setSelectionRange(2, 2));
      await priceInput.press("Backspace");
      assert.equal(await priceInput.inputValue(), "0");
      await priceInput.fill("850.000");
      assert.equal(await priceInput.inputValue(), "850.000");
      await page
        .getByLabel("Số tiền thanh toán 1", { exact: true })
        .fill("300000");
      assert.equal(
        await page
          .getByLabel("Số tiền thanh toán 1", { exact: true })
          .inputValue(),
        "300.000",
      );
      assert.equal(
        await page.getByLabel("Còn lại (₫)", { exact: true }).inputValue(),
        "550.000 ₫",
      );
    }
    try {
      await register(a, emails[0], "Tiệm hoa Mộc");
      await a
        .getByRole("button", { name: "Tạo đơn hàng", exact: true })
        .click();
      await fillOrder(a, "Bó hồng pastel");
      await a
        .getByRole("button", { name: "Lưu đơn hàng", exact: true })
        .click();
      await a
        .getByRole("heading", { name: "Bó hồng pastel", exact: true })
        .waitFor();
      const shopA = await db.shop.findUnique({ where: { email: emails[0] } });
      const orderA = await db.order.findFirst({ where: { shopId: shopA.id } });
      assert.equal(orderA.price, 850000);
      assert.equal(orderA.paidAmount, 300000);
      assert.match(orderA.orderDate, /^\d{4}-\d{2}-\d{2}$/);
      assert.match(orderA.orderTime, /^\d{2}:\d{2}$/);
      // Historical fixture verifies reporting still uses placement, not delivery dates.
      await db.order.update({ where: { id: orderA.id }, data: { orderDate: "2025-02-10", orderTime: "14:35" } });
      await a.reload();
      mkdirSync("artifacts", { recursive: true });
      for (const width of [1440, 390]) {
        await a.setViewportSize({ width, height: 1100 });
        await a.evaluate(() => document.fonts.ready);
        const centered = await a.locator(".order-date").evaluate((box) => {
          const bounds = box.getBoundingClientRect();
          const children = [...box.children].map((child) => child.getBoundingClientRect());
          return children.every((child) => Math.abs((child.left + child.right) / 2 - (bounds.left + bounds.right) / 2) < 1 && child.left >= bounds.left && child.right <= bounds.right)
            && Math.abs((children[0].top + children.at(-1).bottom) / 2 - (bounds.top + bounds.bottom) / 2) < 1;
        });
        assert.ok(centered, `Order date text should be centered at ${width}px`);
        await a.locator(".order-card").screenshot({ path: `artifacts/order-date-centered-${width}.png` });
      }
      await a.setViewportSize({ width: 1440, height: 1100 });
      await navigate(a, "Danh sách đơn");
      await expect(a.locator(".overview-stats")).toHaveCount(0);
      await expect(a.locator(".calendar")).toHaveCount(0);
      await expect(a.locator(".day-insight")).toHaveCount(0);
      await expect(a.locator(".orders-table tbody tr")).toHaveCount(1);
      await expect(a.locator(".orders-table")).toContainText(orderA.code);
      await expect(a.locator(".orders-table")).toContainText("14:35");
      await a.screenshot({ path: "artifacts/orders-table-desktop.png", fullPage: true });
      await a.setViewportSize({ width: 390, height: 844 });
      await expect(a.locator(".orders-table-wrap")).not.toBeVisible();
      await expect(a.locator(".mobile-order")).toBeVisible();
      await expect(a.locator(".mobile-order-meta")).toContainText("Lên đơn 14:35");
      await expect(a.locator(".mobile-order-money strong")).toHaveText(["850.000 ₫", "550.000 ₫"]);
      const stackedMoney = await a.locator(".mobile-order-money strong").evaluateAll((items) => items[1].getBoundingClientRect().top > items[0].getBoundingClientRect().bottom);
      assert.ok(stackedMoney);
      assert.ok(await a.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await a.screenshot({ path: "artifacts/orders-table-mobile.png", fullPage: true });
      await a.setViewportSize({ width: 320, height: 844 });
      assert.ok(await a.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await a.locator(".mobile-order").screenshot({ path: "artifacts/order-card-mobile-320.png" });
      await a.setViewportSize({ width: 390, height: 844 });
      await a.getByRole("button", { name: "Đã giao", exact: true }).click();
      await expect(a.locator(".orders-table")).toHaveCount(0);
      await a.getByRole("button", { name: "Tất cả", exact: true }).click();
      await a.getByRole("button", { name: `Sửa đơn ${orderA.code}`, exact: true }).click();
      await a.getByRole("button", { name: "Lưu đơn hàng", exact: true }).click();
      await a.locator("dialog:not(#shop-menu)").waitFor({ state: "detached" });
      await a.setViewportSize({ width: 1440, height: 1100 });
      await navigate(a, "Tổng quan");
      const receivableCard = a.getByRole("button", { name: "Cần phải thu — xem đơn còn thiếu tiền", exact: true });
      await expect(receivableCard).toContainText("550.000");
      await a.getByLabel("Tìm đơn hàng").fill("Không khớp đơn nào");
      await receivableCard.click();
      await expect(a.getByLabel("Tìm đơn hàng")).toHaveValue("");
      await expect(a.locator(".order-card")).toHaveCount(1);
      await expect(a.locator(".receivable-notice")).toContainText("550.000");
      await a.getByRole("button", { name: "Bỏ lọc cần thu" }).click();
      await a.goto(base + "/reports");
      await a.getByLabel("Từ ngày đặt").fill("2025-02-10");
      await a.getByLabel("Đến ngày đặt").fill("2025-02-10");
      await a.locator("tbody tr").waitFor();
      assert.match(await a.locator("tbody tr").textContent(), /850\.000/);
      assert.match(await a.locator("tbody tr").textContent(), /550\.000/);
      mkdirSync("artifacts", { recursive: true });
      await a.screenshot({
        path: "artifacts/reports-desktop.png",
        fullPage: true,
      });
      await a.setViewportSize({ width: 390, height: 844 });
      assert.ok(
        await a.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await a.screenshot({
        path: "artifacts/reports-mobile.png",
        fullPage: true,
      });
      await a.setViewportSize({ width: 1440, height: 1100 });
      await a.getByLabel("Từ ngày đặt").fill("2025-02-11");
      await a
        .getByRole("alert")
        .filter({ hasText: "Chọn ngày bắt đầu" })
        .waitFor();
      await a.getByLabel("Đến ngày đặt").fill("2025-02-11");
      await a
        .getByRole("heading", { name: "Chưa có đơn trong khoảng ngày này" })
        .waitFor();
      await a.goto(base);
      assert.notEqual(shopA.passwordHash, "FlowerTest123!");
      await a.reload();
      await a
        .getByRole("heading", { name: "Bó hồng pastel", exact: true })
        .waitFor();
      await register(b, emails[1], "Shop Hoa Nắng");
      await b.goto(base + "/reports");
      await b.getByLabel("Từ ngày đặt").fill("2025-02-10");
      await b.getByLabel("Đến ngày đặt").fill("2025-02-10");
      await b
        .getByRole("heading", { name: "Chưa có đơn trong khoảng ngày này" })
        .waitFor();
      assert.equal(await b.locator("tbody tr").count(), 0);
      await b.goto(base);
      assert.equal(
        await b.getByText("Bó hồng pastel", { exact: true }).count(),
        0,
      );
      await b
        .getByRole("button", { name: "Tạo đơn hàng", exact: true })
        .click();
      await fillOrder(b, "Đơn xâm nhập");
      await b
        .locator("input[name=id]")
        .evaluate((element, value) => (element.value = value), orderA.id);
      await b
        .getByRole("button", { name: "Lưu đơn hàng", exact: true })
        .click();
      await b.locator("dialog:not(#shop-menu) .error").waitFor();
      assert.match(
        await b.locator("dialog:not(#shop-menu) .error").textContent(),
        /Không tìm thấy/,
      );
      assert.equal(
        (await db.order.findUnique({ where: { id: orderA.id } })).product,
        "Bó hồng pastel",
      );
      await b.getByRole("button", { name: "Hủy", exact: true }).click();
      await b
        .getByRole("button", { name: "Tạo đơn hàng", exact: true })
        .click();
      await fillOrder(b, "Giỏ hướng dương");
      await b
        .getByRole("button", { name: "Lưu đơn hàng", exact: true })
        .click();
      await b
        .getByRole("heading", { name: "Giỏ hướng dương", exact: true })
        .waitFor();
      await a.reload();
      assert.equal(
        await a.getByText("Giỏ hướng dương", { exact: true }).count(),
        0,
      );
      await a.getByRole("button", { name: "Cần phải thu — xem đơn còn thiếu tiền", exact: true }).click();
      await a
        .getByRole("button", { name: "Sửa đơn Bó hồng pastel", exact: true })
        .click();
      await a.locator("select[name=status]").selectOption("done");
      await a.getByLabel("Số tiền thanh toán 1", { exact: true }).fill("900000");
      await a
        .locator("input[name=paidAmount]")
        .evaluate((el) => el.removeAttribute("max"));
      await a
        .getByRole("button", { name: "Lưu đơn hàng", exact: true })
        .click();
      await a.locator("dialog:not(#shop-menu) .error").waitFor();
      assert.equal(
        (await db.order.findUnique({ where: { id: orderA.id } })).paidAmount,
        300000,
      );
      await a.getByLabel("Số tiền thanh toán 1", { exact: true }).fill("850000");
      await a
        .getByRole("button", { name: "Lưu đơn hàng", exact: true })
        .click();
      await a.locator("dialog:not(#shop-menu)").waitFor({ state: "detached" });
      await expect(a.locator(".receivable-stat")).toContainText("0 ₫");
      await expect(a.locator(".order-card")).toHaveCount(0);
      await a.getByRole("button", { name: "Bỏ lọc cần thu" }).click();
      await expect(a.locator(".order-card")).toHaveCount(1);
      assert.equal(
        (await db.order.findUnique({ where: { id: orderA.id } })).paidAmount,
        850000,
      );
      assert.equal(
        (await db.order.findUnique({ where: { id: orderA.id } })).status,
        "done",
      );
      mkdirSync("artifacts", { recursive: true });
      await a.screenshot({ path: "artifacts/desktop.png", fullPage: true });
      await b.screenshot({ path: "artifacts/mobile.png", fullPage: true });
      for (const width of [360, 390, 768, 1440]) {
        await b.setViewportSize({ width, height: 900 });
        assert.ok(
          await b.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `No overflow at ${width}`,
        );
      }
      await a
        .getByRole("button", { name: "Xóa đơn Bó hồng pastel", exact: true })
        .click();
      await a
        .getByRole("button", { name: "Xóa đơn hàng", exact: true })
        .click();
      await a.locator("dialog:not(#shop-menu)").waitFor({ state: "detached" });
      assert.equal(
        await db.order.findUnique({ where: { id: orderA.id } }),
        null,
      );
      const cookies = await contextA.cookies();
      assert.ok(cookies.find((c) => c.name === "floralhelp_session")?.httpOnly);
      await navigate(a, "Đăng xuất");
      await a.getByRole("heading", { name: "Chào mừng trở lại" }).waitFor();
      await a.getByLabel("Email", { exact: true }).fill(emails[0]);
      await a.getByLabel("Mật khẩu").fill("WrongPassword123");
      await a.getByRole("button", { name: "Vào shop của bạn" }).click();
      await a.locator(".auth-box .error").waitFor();
      await a.getByLabel("Mật khẩu").fill("FlowerTest123!");
      await a.getByRole("button", { name: "Vào shop của bạn" }).click();
      await a
        .getByRole("button", { name: "Tạo đơn hàng", exact: true })
        .waitFor();
    } finally {
      await browser.close();
      await db.shop.deleteMany({ where: { email: { in: emails } } });
      await db.authAttempt.deleteMany({ where: { key: { in: emails } } });
      await db.$disconnect();
    }
  },
);
