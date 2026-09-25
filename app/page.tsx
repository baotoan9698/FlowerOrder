import ShopPage from "./ui/shop-page";
import { redirect } from "next/navigation";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  if (params.view === "orders") redirect("/orders");
  return <ShopPage initialView="calendar" />;
}
