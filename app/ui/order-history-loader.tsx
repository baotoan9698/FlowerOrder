"use client";
import { useEffect, useState } from "react";
import { getOrderHistory } from "../actions";
import type { OrderHistoryView } from "@/lib/order-history";
import OrderHistory from "./order-history";

export default function OrderHistoryLoader({ orderId }: { orderId: string }) {
  const [history, setHistory] = useState<OrderHistoryView[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    setHistory(null); setError(false);
    getOrderHistory(orderId).then((entries) => { if (active) setHistory(entries); }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [orderId]);
  if (error) return <p role="alert">Chưa tải được lịch sử thay đổi. Vui lòng mở lại đơn hàng.</p>;
  if (!history) return <p role="status">Đang tải lịch sử thay đổi…</p>;
  return <OrderHistory history={history} />;
}
