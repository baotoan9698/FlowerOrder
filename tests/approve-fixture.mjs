import { expect } from "@playwright/test";
// Test-only approval for existing business-flow suites; admin.test covers the real approval UI.
export async function approveFixture(page, db) {
  await expect(page.locator('p[role="alert"]')).toContainText("chờ quản trị viên");
  const email = (await page.getByLabel("Email", { exact: true }).inputValue()).toLowerCase();
  await db.shop.update({ where: { email }, data: { accessStatus: "active", accessUntil: new Date(Date.now() + 86400000) } });
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  // Seed a valid session without retaining passwords from the registration form.
  const { randomBytes, createHash } = await import("node:crypto");
  const token = randomBytes(32).toString("hex");
  const shop = await db.shop.findUniqueOrThrow({ where: { email } });
  await db.session.create({ data: { id: createHash("sha256").update(token).digest("hex"), shopId: shop.id, expiresAt: new Date(Date.now() + 3600000) } });
  await page.context().addCookies([{ name: "floralhelp_session", value: token, url: new URL(page.url()).origin, httpOnly: true, sameSite: "Lax" }]);
  await page.goto(new URL(page.url()).origin);
}
