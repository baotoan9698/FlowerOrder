import { currentShop } from "@/lib/auth";
import { shopData } from "@/lib/shop-data";
import type { OrderView, CashView } from "@/lib/validation";
import { redirect } from "next/navigation";
import Dashboard from "./dashboard";
export default async function ShopPage({
  initialView = "calendar",
}: {
  initialView?: "calendar" | "reports" | "orders" | "products" | "cashflow" | "customers";
}) {
  const shop = await currentShop();
  if (!shop) redirect("/login");
  const data = await shopData();
  const [orders, products, cashEntries, customers] = await Promise.all([
    data.orders(),
    data.products(),
    initialView === "cashflow" || initialView === "reports" ? data.cashEntries() : Promise.resolve([]),
    data.customers(),
  ]);
  return (
    <Dashboard
      key={`${shop.id}:${initialView}`}
      initialView={initialView}
      shop={{ name: shop.name, email: shop.email }}
      orders={orders as OrderView[]}
      products={products}
      customers={customers}
      cashEntries={cashEntries as CashView[]}
    />
  );
}
