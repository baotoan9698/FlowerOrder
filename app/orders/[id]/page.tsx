import { notFound } from "next/navigation";
import { currentShop } from "@/lib/auth";
import { shopData } from "@/lib/shop-data";
import type { OrderView } from "@/lib/validation";
import AuthForm from "../../ui/auth-form";
import OrderDetail from "../../ui/order-detail";
import type { OrderChange } from "@/lib/order-history";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const shop = await currentShop();
  if (!shop) return <AuthForm />;
  const { id } = await params;
  const data = await shopData();
  const order = await data.orderDetail(id);
  if (!order) notFound();
  const [products, customers, entries] = await Promise.all([data.products(), data.customers(), data.orderHistory(id)]);
  const history = entries.map((entry) => ({ ...entry, createdAt: entry.createdAt.toISOString(), changes: JSON.parse(entry.changes) as OrderChange[] }));
  return <OrderDetail key={order.id} order={order as OrderView} products={products} customers={customers} history={history} />;
}
