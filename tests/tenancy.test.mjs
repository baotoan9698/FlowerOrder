import { approveFixture } from "./approve-fixture.mjs";
import { navigate } from "./navigation.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import { existsSync, mkdirSync } from "node:fs";
import { unlink } from "node:fs/promises";
import { resolve, sep } from "node:path";

test(
  "Products, private photos, linked orders and shop settings cannot cross tenants",
  { timeout: 180000 },
  async () => {
    const db = new PrismaClient();
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
    const contexts = await Promise.all([
      browser.newContext({ viewport: { width: 1440, height: 1000 } }),
      browser.newContext({ viewport: { width: 390, height: 844 } }),
      browser.newContext(),
    ]);
    const [a, b] = await Promise.all([
      contexts[0].newPage(),
      contexts[1].newPage(),
    ]);
    const base = process.env.TEST_URL || "http://127.0.0.1:3000";
    const run = Date.now();
    const emails = [
      `tenant-a-${run}@example.com`,
      `tenant-b-${run}@example.com`,
    ];
    const password = "TenantTesting123!";
    const png = await sharp({
      create: { width: 40, height: 40, channels: 3, background: "#cc7799" },
    })
      .png()
      .toBuffer();
    const imagePayload = {
      name: "flower.png",
      mimeType: "image/png",
      buffer: png,
    };
    const headers = { origin: base };
    let shopA, shopB;
    async function register(page, index) {
      await page.goto(base);
      await page
        .getByRole("button", { name: "Tạo shop mới", exact: true })
        .click();
      await page.getByLabel("Tên shop").fill(`Private shop ${index}`);
      await page.getByLabel("Email", { exact: true }).fill(emails[index]);
      await page.getByLabel("Mật khẩu").fill(password);
      await page.getByRole("button", { name: "Tạo shop", exact: true }).click();
      await approveFixture(page, db);
      await page
        .getByRole("button", { name: "Tạo đơn hàng", exact: true })
        .waitFor();
    }
    async function createProduct(page, name, foreignShop) {
      await page.goto(base + "/products");
      await page
        .getByRole("button", { name: "Thêm sản phẩm", exact: true })
        .click();
      await page.getByLabel("Tên sản phẩm", { exact: true }).fill(name);
      await page.getByLabel("Giá sản phẩm (₫)", { exact: true }).fill("850000");
      if (foreignShop)
        await page.locator("dialog:not(#shop-menu) form").evaluate((form, value) => {
          const input = document.createElement("input");
          input.name = "shopId";
          input.value = value;
          form.append(input);
        }, foreignShop);
      await page
        .getByRole("button", { name: "Lưu sản phẩm", exact: true })
        .click();
      await page.locator("dialog:not(#shop-menu)").waitFor({ state: "hidden" });
      await page.getByRole("heading", { name, exact: true }).waitFor();
    }
    async function createOrder(page, productId) {
      await page.goto(base);
      await page
        .getByRole("button", { name: "Tạo đơn hàng", exact: true })
        .click();
      const selected = await db.product.findUniqueOrThrow({ where: { id: productId } });
      await page.getByRole("combobox", { name: "Sản phẩm", exact: true }).fill(selected.name);
      await page.getByRole("listbox", { name: "Sản phẩm gợi ý 1" }).getByRole("option").click();
      await page.getByRole("combobox", { name: "Khách hàng", exact: true }).fill("Private customer");
      await page.getByLabel("Số điện thoại").fill("0901234567");
      await page.getByLabel("Địa chỉ").fill("Private address");
      await page
        .getByRole("button", { name: "Lưu đơn hàng", exact: true })
        .click();
      await page.locator("dialog:not(#shop-menu)").waitFor({ state: "detached" });
    }
    try {
      await register(a, 0);
      await register(b, 1);
      shopA = await db.shop.findUnique({ where: { email: emails[0] } });
      shopB = await db.shop.findUnique({ where: { email: emails[1] } });
      await createProduct(a, "Hoa bí mật A");
      await createProduct(b, "Hoa bí mật B", shopA.id);
      const productA = await db.product.findFirst({
        where: { shopId: shopA.id },
      });
      const productB = await db.product.findFirst({
        where: { shopId: shopB.id },
      });
      assert.ok(productA && productB);
      assert.equal(
        await b.getByText("Hoa bí mật A", { exact: true }).count(),
        0,
      );
      assert.equal(await db.product.count({ where: { shopId: shopA.id } }), 1);
      // Alter the actual action request, including clients that restore hidden IDs.
      await b.getByRole("button", { name: "Sửa", exact: true }).click();
      let editReplaced = false;
      await b.route(base + '/products', async route => {
        const body = route.request().postData();
        if (route.request().method() === 'POST' && body?.includes(productB.id)) {
          editReplaced = true;
          await route.continue({ postData: body.replaceAll(productB.id, productA.id) });
        } else await route.continue();
      });
      await b.getByLabel("Tên sản phẩm").fill("Compromised");
      await b.getByRole("button", { name: "Lưu sản phẩm" }).click();
      await b.locator("dialog:not(#shop-menu) .error").waitFor();
      assert.equal(editReplaced, true);
      await b.unroute(base + '/products');
      assert.equal(
        (await db.product.findUnique({ where: { id: productA.id } })).name,
        "Hoa bí mật A",
      );
      await b.getByRole("button", { name: "Hủy", exact: true }).click();
      let archiveReplaced = false;
      await b.route(base + '/products', async route => {
        const request = route.request(); const body = request.postData();
        if (request.method() === 'POST' && request.headers()['next-action'] && body?.includes(productB.id)) {
          archiveReplaced = true; await route.continue({ postData: body.replaceAll(productB.id, productA.id) });
        } else await route.continue();
      });
      await b.getByRole('button', { name: 'Ẩn sản phẩm Hoa bí mật B', exact: true }).click();
      await b.locator('.products-page > .error').waitFor();
      assert.ok(archiveReplaced); assert.equal((await db.product.findUnique({ where: { id: productA.id } })).archived, false);
      await b.unroute(base + '/products');
      const uploadUrl = `${base}/api/products/${productA.id}/images`;
      assert.equal(
        (
          await contexts[1].request.post(uploadUrl, {
            headers,
            multipart: { image: imagePayload },
          })
        ).status(),
        404,
      );
      assert.equal(
        (
          await contexts[2].request.post(uploadUrl, {
            headers,
            multipart: { image: imagePayload },
          })
        ).status(),
        401,
      );
      assert.equal(
        (
          await contexts[0].request.post(uploadUrl, {
            headers: { origin: "https://other.invalid" },
            multipart: { image: imagePayload },
          })
        ).status(),
        403,
      );
      assert.equal(
        (
          await contexts[0].request.post(uploadUrl, {
            headers,
            multipart: {
              image: {
                ...imagePayload,
                buffer: Buffer.from('<svg onload="alert(1)"/>'),
              },
            },
          })
        ).status(),
        400,
      );
      const upload = await contexts[0].request.post(uploadUrl, {
        headers,
        multipart: { image: imagePayload },
      });
      assert.equal(upload.status(), 201, await upload.text());
      const imageId = (await upload.json()).id;
      const imageUrl = `${base}/api/images/${imageId}`;
      const ownImage = await contexts[0].request.get(imageUrl);
      assert.equal(ownImage.status(), 200);
      assert.equal(ownImage.headers()["content-type"], "image/webp");
      assert.match(ownImage.headers()["cache-control"], /private.*no-store/);
      assert.equal((await contexts[1].request.get(imageUrl)).status(), 404);
      assert.equal((await contexts[2].request.get(imageUrl)).status(), 401);
      assert.equal(
        (await contexts[1].request.delete(imageUrl, { headers })).status(),
        404,
      );
      for (let i = 0; i < 2; i++)
        assert.equal(
          (
            await contexts[0].request.post(uploadUrl, {
              headers,
              multipart: { image: imagePayload },
            })
          ).status(),
          201,
        );
      assert.equal(
        (
          await contexts[0].request.post(uploadUrl, {
            headers,
            multipart: { image: imagePayload },
          })
        ).status(),
        409,
      );
      await a.reload();
      await a.locator(".product-images img").first().waitFor();
      await a.waitForFunction(() =>
        [...document.querySelectorAll(".product-images img")].every(
          (img) => img.complete && img.naturalWidth > 0,
        ),
      );
      mkdirSync("artifacts", { recursive: true });
      await a.screenshot({
        path: "artifacts/products-desktop.png",
        fullPage: true,
      });
      await a.setViewportSize({ width: 360, height: 800 });
      assert.ok(
        await a.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await a.screenshot({
        path: "artifacts/products-mobile.png",
        fullPage: true,
      });
      await a.setViewportSize({ width: 1440, height: 1000 });
      await createOrder(a, productA.id);
      await createOrder(b, productB.id);
      const orderA = await db.order.findFirst({ where: { shopId: shopA.id } });
      const orderB = await db.order.findFirst({ where: { shopId: shopB.id } });
      assert.equal(orderA.productId, productA.id);
      assert.equal(orderA.price, 850000);
      await b
        .getByRole("button", { name: "Sửa đơn Hoa bí mật B", exact: true })
        .click();
      await b.locator('input[name="items"]').evaluate((input, value) => {
        const items = JSON.parse(input.value);
        items[0].productId = value;
        input.value = JSON.stringify(items);
      }, productA.id);
      await b
        .getByRole("button", { name: "Lưu đơn hàng", exact: true })
        .click();
      await b.locator("dialog:not(#shop-menu) .error").waitFor();
      assert.equal(
        (await db.order.findUnique({ where: { id: orderB.id } })).productId,
        productB.id,
      );
      await b.getByRole("button", { name: "Hủy", exact: true }).click();
      // Even direct database writes cannot link objects across shops.
      await assert.rejects(
        db.order.update({
          where: { id: orderB.id },
          data: { productId: productA.id },
        }),
      );
      await assert.rejects(
        db.productImage.create({
          data: {
            shopId: shopB.id,
            productId: productA.id,
            slot: 1,
            storageKey: "forged",
            storageDriver: "local",
          },
        }),
      );
      let replaced = false;
      await b.route(base + "/", async (route) => {
        const request = route.request();
        const body = request.postData();
        if (
          request.method() === "POST" &&
          request.headers()["next-action"] &&
          body?.includes(orderB.id)
        ) {
          replaced = true;
          await route.continue({
            postData: body.replaceAll(orderB.id, orderA.id),
          });
        } else await route.continue();
      });
      await b
        .getByRole("button", { name: "Xóa đơn Hoa bí mật B", exact: true })
        .click();
      await b
        .getByRole("button", { name: "Xóa đơn hàng", exact: true })
        .click();
      await b.locator("dialog:not(#shop-menu) .error").waitFor();
      assert.ok(replaced);
      assert.ok(await db.order.findUnique({ where: { id: orderA.id } }));
      await b.unroute(base + "/");
      await b.getByRole("button", { name: "Giữ lại", exact: true }).click();
      await navigate(b, "Cài đặt shop");
      await b.getByLabel("Tên shop", { exact: true }).fill("B renamed");
      await b.locator("dialog:not(#shop-menu) form").evaluate((form, value) => {
        const input = document.createElement("input");
        input.name = "shopId";
        input.value = value;
        form.append(input);
      }, shopA.id);
      await b
        .getByRole("button", { name: "Lưu thay đổi", exact: true })
        .click();
      await b.locator("dialog:not(#shop-menu)").waitFor({ state: "detached" });
      assert.equal(
        (await db.shop.findUnique({ where: { id: shopA.id } })).name,
        "Private shop 0",
      );
      assert.equal(
        (await db.shop.findUnique({ where: { id: shopB.id } })).name,
        "B renamed",
      );
      const token = (await contexts[0].cookies()).find(
        (c) => c.name === "floralhelp_session",
      ).value;
      await navigate(a, "Đăng xuất");
      await a.getByLabel("Email", { exact: true }).waitFor();
      assert.equal((await contexts[0].request.get(imageUrl)).status(), 401);
      assert.equal(
        (
          await contexts[2].request.get(imageUrl, {
            headers: { cookie: `floralhelp_session=${token}` },
          })
        ).status(),
        401,
      );
      // Expired sessions fail closed as well.
      await db.session.updateMany({
        where: { shopId: shopB.id },
        data: { expiresAt: new Date(0) },
      });
      // Reusing the same browser for another shop must not reuse the old catalog.
      await a.getByLabel('Email', { exact: true }).fill(emails[1]);
      await a.getByLabel('Mật khẩu').fill(password);
      await a.getByRole('button', { name: 'Vào shop của bạn', exact: true }).click();
      await a.getByRole('button', { name: 'Tạo đơn hàng', exact: true }).waitFor();
      await a.goto(base + '/products');
      await a.getByRole('heading', { name: 'Hoa bí mật B', exact: true }).waitFor();
      assert.equal(await a.getByText('Hoa bí mật A', { exact: true }).count(), 0);
      assert.equal((await contexts[0].request.get(imageUrl)).status(), 404);
      assert.equal((await contexts[1].request.get(imageUrl)).status(), 401);
    } finally {
      await browser.close();
      const shops = await db.shop.findMany({
        where: { email: { in: emails } },
        select: { id: true },
      });
      const images = await db.productImage.findMany({
        where: { shopId: { in: shops.map((s) => s.id) } },
      });
      const root = resolve(".private-storage");
      for (const image of images) {
        const path = resolve(root, image.storageKey);
        if (
          image.storageDriver === "local" &&
          path.startsWith(root + sep) &&
          image.storageKey.startsWith(`shops/${image.shopId}/`)
        )
          await unlink(path).catch(() => {});
      }
      await db.shop.deleteMany({ where: { email: { in: emails } } });
      await db.authAttempt.deleteMany({ where: { key: { in: emails } } });
      await db.$disconnect();
    }
  },
);
