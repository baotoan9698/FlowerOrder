export async function navigate(page, name) {
  const desktop = page.getByRole("complementary", { name: "Menu PC", exact: true });
  if (await desktop.isVisible()) {
    await desktop.getByRole("button", { name, exact: true }).click();
    return;
  }
  const menu = page.getByRole("dialog", { name: "Menu quản lý shop", exact: true });
  if (!(await menu.isVisible())) await page.getByRole("button", { name: "Mở menu", exact: true }).click();
  await menu.getByRole("button", { name, exact: true }).click();
}
