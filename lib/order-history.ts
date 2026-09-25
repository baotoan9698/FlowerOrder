import { statuses, paymentMethods, type OrderItemInput } from "./validation";

export type OrderChange = { field: string; before: string; after: string };
export type OrderHistoryView = { id: string; action: string; actorName: string; actorEmail: string; createdAt: string; changes: OrderChange[] };
type Snapshot = {
  customer: string; phone: string; address: string; customerCode: string;
  date: string; time: string; orderDate: string; orderTime: string;
  source: string; status: string; note: string; price: number; paidAmount: number;
  items: OrderItemInput[];
  shippingFee: number;
  discount: number;
  payments: { amount: number; method: string }[];
};
const money = (value: number) => new Intl.NumberFormat("vi-VN").format(value) + " ₫";
const date = (value: string) => value ? value.split("-").reverse().join("/") : "";
export function orderChanges(before: Snapshot | null, after: Snapshot): OrderChange[] {
  if (!before) return [];
  const values = (snapshot: Snapshot) => ({
    "Mã khách hàng": snapshot.customerCode,
    "Khách hàng": snapshot.customer,
    "Số điện thoại": snapshot.phone,
    "Địa chỉ": snapshot.address,
    "Ngày giao": date(snapshot.date),
    "Giờ giao": snapshot.time,
    "Ngày lên đơn": date(snapshot.orderDate),
    "Giờ lên đơn": snapshot.orderTime,
    "Nguồn đơn": snapshot.source,
    "Trạng thái": statuses[snapshot.status as keyof typeof statuses] ?? snapshot.status,
    "Giá trị đơn": money(snapshot.price),
    "Chi phí vận chuyển": money(snapshot.shippingFee),
    "Giảm giá": money(snapshot.discount),
    "Đã thanh toán": money(snapshot.paidAmount),
    "Còn phải thu": money(snapshot.price - snapshot.paidAmount),
    "Ghi chú": snapshot.note,
  });
  const previous = before ? values(before) : null;
  const next = values(after);
  const changes: OrderChange[] = [];
  for (const key of Object.keys(next) as (keyof typeof next)[]) {
    const oldValue = previous?.[key] ?? "";
    if (oldValue !== next[key]) changes.push({ field: key, before: oldValue, after: next[key] });
  }
  const plainItems = (items: OrderItemInput[]) => items.map(({ productId, name, quantity, unitPrice }) => ({ productId, name, quantity, unitPrice }));
  const oldItems = before ? plainItems(before.items) : [];
  const newItems = plainItems(after.items);
  const describePayments = (payments: Snapshot["payments"]) => payments.map((payment, index) => `${index + 1}. ${money(payment.amount)} · ${paymentMethods[payment.method as keyof typeof paymentMethods] ?? payment.method}`).join("\n");
  const oldPayments = before ? describePayments(before.payments) : "";
  const newPayments = describePayments(after.payments);
  if (oldPayments !== newPayments) changes.push({ field: "Các lượt thanh toán", before: oldPayments, after: newPayments });
  if (JSON.stringify(oldItems) !== JSON.stringify(newItems)) {
    const describe = (items: OrderItemInput[]) => items.map((item, index) => `${index + 1}. ${item.name} × ${item.quantity} · ${money(item.unitPrice)}/sản phẩm · ${item.productId ? "Danh mục" : "Nhập trực tiếp"}`).join("\n");
    changes.push({ field: "Sản phẩm", before: describe(oldItems), after: describe(newItems) });
  }
  return changes;
}
