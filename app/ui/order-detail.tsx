"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { statuses, type OrderView, type ProductView, type CustomerView } from "@/lib/validation";
import { saveOrder } from "../actions";
import OrderForm from "./order-form";
import OrderHistory from "./order-history";
import type { OrderHistoryView } from "@/lib/order-history";

export default function OrderDetail({ order, products, customers, history }: { order: OrderView; products: ProductView[]; customers: CustomerView[]; history: OrderHistoryView[] }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const router = useRouter();
  return <main className="order-detail-page">
    <Link className="order-back-link" href="/orders"><ArrowLeft size={17} />Danh sách đơn hàng</Link>
    <section className="order-modal order-detail card">
      <div className="modal-head">
        <div><h1>Đơn hàng {order.code}</h1><p className="order-detail-meta">Lên đơn: {order.orderTime || "Chưa có giờ"} · {order.orderDate.split("-").reverse().join("/")} <span className={`badge ${order.status}`}>{statuses[order.status]}</span></p></div>
        <div className="order-header-actions"><button className="secondary" type="button" disabled={pending} onClick={() => router.push("/orders")}>Quay lại</button><button className="primary" type="submit" form="order-editor-form" disabled={pending}>{pending ? "Đang lưu…" : "Lưu đơn hàng"}</button></div>
      </div>
      {notice && <p className="notice" role="status">{notice}</p>}
      <OrderForm order={order} products={products} customers={customers} defaultDate={order.date} error={error} onSubmit={(form) => {
        if (pending) return;
        setError(""); setNotice("");
        start(async () => {
          try {
            const result = await saveOrder(form);
            if (result.error) setError(result.error);
            else { setNotice("Đã lưu thay đổi đơn hàng."); router.refresh(); }
          } catch { setError("Chưa thể lưu đơn hàng. Vui lòng thử lại."); }
        });
      }} />
    </section>
    <OrderHistory history={history} />
  </main>;
}
