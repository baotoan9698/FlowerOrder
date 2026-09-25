import type { OrderView } from "@/lib/validation";
export default function OrderItemSummary({ order }: { order: OrderView }) {
  if (!order.items?.length) return <span>{order.product}</span>;
  return <span className="order-item-summary">{order.items.map((item, index) => <span key={index}>{item.name}{(order.items!.length > 1 || item.quantity > 1) && <small> × {item.quantity}</small>}</span>)}</span>;
}
