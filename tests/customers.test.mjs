import { navigate } from "./navigation.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { existsSync, mkdirSync } from "node:fs";

test("Order and customer codes, customer reuse, concurrent saves and tenant isolation", { timeout: 150000 }, async () => {
  const db = new PrismaClient();
  const executablePath = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
  const browser = await chromium.launch({ headless: true, executablePath });
  const contexts = await Promise.all([browser.newContext(), browser.newContext()]);
  const [a, b] = await Promise.all(contexts.map((c) => c.newPage()));
  const emails = [0, 1].map((i) => `customer-test-${Date.now()}-${i}@example.com`);
  const base = "http://127.0.0.1:3000";
  async function form(page, product, customerId) {
    await page.getByRole("button", { name: "Tạo đơn hàng", exact: true }).click();
    if (customerId) {
      await page.getByRole("combobox", { name: "Khách hàng", exact: true }).fill("0901");
      await page.getByRole("listbox", { name: "Khách hàng gợi ý" }).getByRole("option").first().click();
      await expect(page.locator('input[name="customerId"]')).toHaveValue(customerId);
    }
    else {
      await page.getByRole("combobox", { name: "Khách hàng", exact: true }).fill("Khách dùng lại");
      await page.getByLabel("Số điện thoại", { exact: true }).fill("0901234567");
    }
    await page.getByLabel("Địa chỉ").fill("Địa chỉ riêng cho " + product);
    await page.getByRole("combobox", { name: "Sản phẩm", exact: true }).fill(product);
    await page.getByLabel("Đơn giá (₫)", { exact: true }).fill("500000");
  }
  async function save(page) {
    await page.getByRole("button", { name: "Lưu đơn hàng", exact: true }).click();
    await page.locator("dialog:not(#shop-menu)").waitFor({ state: "detached" });
  }
  try {
    for (let i = 0; i < 2; i++) {
      const page = [a, b][i];
      await page.goto(base);
      await page.getByRole("button", { name: "Tạo shop mới", exact: true }).click();
      await page.getByLabel("Tên shop").fill(`Customer test ${i}`);
      await page.getByLabel("Email", { exact: true }).fill(emails[i]);
      await page.getByLabel("Mật khẩu").fill("CustomerTest123!");
      await page.getByRole("button", { name: "Tạo shop", exact: true }).click();
      await page.getByRole("button", { name: "Tạo đơn hàng", exact: true }).waitFor();
    }
    const shops = await Promise.all(emails.map((email) => db.shop.findUniqueOrThrow({ where: { email } })));
    await form(a, "Hoa đầu tiên"); await save(a);
    const first = await db.order.findFirstOrThrow({ where: { shopId: shops[0].id } });
    const customer = await db.customer.findUniqueOrThrow({ where: { id: first.customerId } });
    assert.equal(first.code, "DH000001"); assert.equal(customer.code, "KH000001");
    await form(a, "Hoa thứ hai", customer.id);
    await expect(a.getByRole("combobox", { name: "Khách hàng", exact: true })).toHaveValue(customer.name);
    // Name suggestions accept unaccented text and keyboard selection.
    await a.getByRole("combobox", { name: "Khách hàng", exact: true }).fill("khach dung");
    await expect(a.getByRole("listbox", { name: "Khách hàng gợi ý" }).getByRole("option")).toHaveCount(1);
    await a.getByRole("combobox", { name: "Khách hàng", exact: true }).press("ArrowDown");
    await a.getByRole("combobox", { name: "Khách hàng", exact: true }).press("Enter");
    await expect(a.locator('input[name="customerId"]')).toHaveValue(customer.id);
    await a.getByLabel("Địa chỉ").fill("Địa chỉ riêng cho Hoa thứ hai");
    await save(a);
    await form(a, "Hoa nhập lại cùng khách"); await save(a);
    assert.equal(await db.customer.count({ where: { shopId: shops[0].id } }), 1);
    assert.equal(await db.order.count({ where: { shopId: shops[0].id, customerId: customer.id } }), 3);
    // Two independent pages submit at once: no duplicate or reused codes.
    const parallel = await contexts[0].newPage(); await parallel.goto(base);
    await form(a, "Đồng thời A", customer.id); await form(parallel, "Đồng thời B", customer.id);
    await Promise.all([save(a), save(parallel)]);
    const codes = (await db.order.findMany({ where: { shopId: shops[0].id }, orderBy: { code: "asc" } })).map((o) => o.code);
    assert.deepEqual(codes, ["DH000001", "DH000002", "DH000003", "DH000004", "DH000005"]);
    await a.reload();
    await a.getByLabel("Tìm đơn hàng").fill("DH000001");
    await expect(a.locator(".order-card")).toHaveCount(1);
    await a.getByRole("button", { name: "Sửa đơn Hoa đầu tiên", exact: true }).click();
    await expect(a.getByLabel("Mã đơn hàng", { exact: true })).toHaveValue("DH000001");
    await a.getByLabel("Địa chỉ").fill("Địa chỉ mới chỉ cho đơn 1");
    mkdirSync("artifacts", { recursive: true });
    await a.setViewportSize({ width: 390, height: 844 });
    await a.screenshot({ path: "artifacts/order-customer-mobile.png", fullPage: true });
    assert.ok(await a.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await save(a);
    assert.equal((await db.order.findUniqueOrThrow({ where: { id: first.id } })).code, first.code);
    assert.equal((await db.customer.findUniqueOrThrow({ where: { id: customer.id } })).address, customer.address);
    await form(b, "Shop B"); await save(b);
    const ownB = await db.order.findFirstOrThrow({ where: { shopId: shops[1].id } });
    assert.equal(ownB.code, "DH000001"); assert.notEqual(ownB.customerId, first.customerId);
    await form(b, "Thử liên kết sai shop", ownB.customerId);
    await expect(b.locator('input[name="customerId"]')).toHaveValue(ownB.customerId);
    let forged = false;
    await b.route(base + "/", async (route) => {
      const body = route.request().postData();
      if (route.request().method() === "POST" && body?.includes(ownB.customerId)) {
        forged = true; await route.continue({ postData: body.replaceAll(ownB.customerId, customer.id) });
      } else await route.continue();
    });
    await b.getByRole("button", { name: "Lưu đơn hàng", exact: true }).click();
    await expect(b.locator("dialog:not(#shop-menu) .error")).toContainText("Không tìm thấy khách hàng");
    assert.equal(forged, true);
    assert.equal(await db.order.count({ where: { shopId: shops[1].id } }), 1);
    assert.equal((await db.shop.findUniqueOrThrow({ where: { id: shops[1].id } })).orderSequence, 1);
    await assert.rejects(db.order.update({ where: { id: ownB.id }, data: { customerId: customer.id } }));
    await b.unroute(base + "/");
    await b.getByRole("button", { name: "Hủy", exact: true }).click();
    // Deleting a number does not make it available for reuse.
    await db.order.delete({ where: { id: ownB.id } });
    await b.reload(); await form(b, "Sau xóa", ownB.customerId); await save(b);
    assert.equal((await db.order.findFirstOrThrow({ where: { shopId: shops[1].id } })).code, "DH000002");
    await form(b, "Khách mới từ SĐT");
    await b.getByRole("combobox", { name: "Khách hàng", exact: true }).fill("0987654321");
    await expect(b.getByRole("status").filter({ hasText: "Chưa tìm thấy khách phù hợp" })).toBeVisible();
    await b.getByRole("button", { name: "+ Thêm khách hàng mới", exact: true }).click();
    await b.getByLabel("Tên khách hàng mới", { exact: true }).fill("Khách mới số điện thoại");
    await expect(b.getByLabel("Số điện thoại", { exact: true })).toHaveValue("0987654321");
    await save(b);
    assert.equal(await db.customer.count({ where: { shopId: shops[1].id, phone: "0987654321", name: "Khách mới số điện thoại" } }), 1);
    await navigate(b, "Khách hàng");
    await b.getByRole("button", { name: "Thêm khách hàng", exact: true }).click();
    await b.getByLabel("Tên khách hàng", { exact: true }).fill("Nguyễn Ánh Mai");
    await b.getByLabel("Số điện thoại", { exact: true }).fill("0912345678");
    await b.getByLabel("Địa chỉ", { exact: true }).fill("Địa chỉ danh bạ");
    await b.locator("dialog:not(#shop-menu) form").evaluate((form, shopId) => { const input = document.createElement("input"); input.name = "shopId"; input.value = shopId; form.append(input); }, shops[0].id);
    await b.getByRole("button", { name: "Lưu khách hàng", exact: true }).click();
    await b.locator("dialog:not(#shop-menu)").waitFor({ state: "hidden" });
    await expect(b.getByRole("heading", { name: "Nguyễn Ánh Mai", exact: true })).toBeVisible();
    const directoryCustomer = await db.customer.findFirstOrThrow({ where: { shopId: shops[1].id, name: "Nguyễn Ánh Mai" } });
    assert.equal(await db.customer.count({ where: { shopId: shops[0].id, name: "Nguyễn Ánh Mai" } }), 0);
    await b.getByLabel("Tìm trong danh bạ khách hàng").fill("nguyen anh");
    await expect(b.locator(".customer-profile")).toHaveCount(1);
    await b.setViewportSize({ width: 390, height: 844 });
    assert.ok(await b.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await b.screenshot({ path: "artifacts/customer-directory-mobile.png", fullPage: true });
    await b.getByRole("button", { name: "Thêm khách hàng", exact: true }).click();
    await b.getByLabel("Tên khách hàng", { exact: true }).fill("Nguyễn Ánh Mai");
    await b.getByLabel("Số điện thoại", { exact: true }).fill("0912 345 678");
    await b.getByRole("button", { name: "Lưu khách hàng", exact: true }).click();
    await expect(b.locator("dialog:not(#shop-menu) .error")).toContainText(directoryCustomer.code);
    await b.getByRole("button", { name: "Hủy", exact: true }).click();
    await a.goto(base + "/customers");
    await expect(a.getByRole("heading", { name: "Nguyễn Ánh Mai", exact: true })).toHaveCount(0);
    await navigate(b, "Tổng quan");
    await form(b, "Đơn từ danh bạ");
    await b.getByRole("combobox", { name: "Khách hàng", exact: true }).fill("091234");
    await b.getByRole("listbox", { name: "Khách hàng gợi ý" }).getByRole("option").click();
    await expect(b.getByLabel("Địa chỉ")).toHaveValue("Địa chỉ danh bạ");
    await save(b);
    assert.equal((await db.order.findFirstOrThrow({ where: { shopId: shops[1].id, product: "Đơn từ danh bạ" } })).customerId, directoryCustomer.id);
    await navigate(b, "Khách hàng");
    await b.getByRole("button", { name: "Sửa khách hàng Nguyễn Ánh Mai", exact: true }).click();
    await expect(b.getByLabel("Tên khách hàng", { exact: true })).toHaveValue("Nguyễn Ánh Mai");
    await b.getByLabel("Tên khách hàng", { exact: true }).fill("Nguyễn Mai mới");
    await b.getByLabel("Số điện thoại", { exact: true }).fill("0988888888");
    await b.getByLabel("Địa chỉ", { exact: true }).fill("Địa chỉ mới");
    await b.getByRole("button", { name: "Lưu khách hàng", exact: true }).click();
    await b.locator("dialog:not(#shop-menu)").waitFor({ state: "hidden" });
    const updated = await db.customer.findUniqueOrThrow({ where: { id: directoryCustomer.id } });
    assert.equal(updated.code, directoryCustomer.code);
    assert.equal(updated.name, "Nguyễn Mai mới");
    assert.equal(updated.phone, "0988888888");
    assert.equal(updated.address, "Địa chỉ mới");
    assert.equal((await db.order.findFirstOrThrow({ where: { shopId: shops[1].id, product: "Đơn từ danh bạ" } })).customer, "Nguyễn Ánh Mai");
    await navigate(b, "Tổng quan");
    await form(b, "Đơn Facebook");
    await b.getByLabel("Nguồn đơn", { exact: true }).selectOption("Facebook");
    await save(b);
    assert.equal((await db.order.findFirstOrThrow({ where: { shopId: shops[1].id, product: "Đơn Facebook" } })).source, "Facebook");
  } finally {
    await db.shop.deleteMany({ where: { email: { in: emails } } });
    await db.authAttempt.deleteMany({ where: { key: { in: emails } } });
    await browser.close(); await db.$disconnect();
  }
});
