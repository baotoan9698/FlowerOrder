"use client";
import { useState } from "react";
import { statuses, orderSources, type OrderView, type ProductView, type CustomerView } from "@/lib/validation";
import PaymentFields from "./order-payment-fields";
import OrderCustomerFields from "./order-customer-fields";
import OrderProductFields from "./order-product-fields";
export default function OrderForm({ order, products, customers, defaultDate, error, onSubmit }: {
  order: OrderView | "new"; products: ProductView[]; customers: CustomerView[];
  defaultDate: string; error: string; onSubmit: (form: FormData) => void;
}) {
  const [suggestedPrice, setSuggestedPrice] = useState<{ value: number } | null>(null);
  return (
          <form
            onSubmit={(event) => { event.preventDefault(); onSubmit(new FormData(event.currentTarget)); }}
            className="order-form"
            id="order-editor-form"
          >
            <input
              type="hidden"
              name="id"
              value={order === "new" ? "" : order.id}
            />
            <div className="order-layout">
              <div className="order-column order-column-details">
              <section className="order-section order-customer compact-customer form-grid">
              <OrderCustomerFields order={order} customers={customers} />
              </section>
              <section className="order-section order-info form-grid"><h3 className="span-two">Thông tin đơn</h3>
              <label className="span-two">Mã đơn hàng<input readOnly value={order === "new" ? "Tự cấp khi lưu đơn" : order.code} /></label>
              <label>Nguồn đơn
                <select aria-label="Nguồn đơn" name="source" defaultValue={order === "new" ? "Trực tiếp" : order.source}>
                  <option value="">Chưa chọn</option>
                  {orderSources.map((source) => <option key={source} value={source}>{source}</option>)}
                </select>
              </label>
              <label>
                Trạng thái
                <select
                  name="status"
                  defaultValue={order === "new" ? "pending" : order.status}
                >
                  {Object.entries(statuses).map(([k, v]) => (
                    <option value={k} key={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              {(
                [
                  { name: "date", label: "Ngày giao", type: "date" },
                  { name: "time", label: "Giờ giao", type: "time" },
                ] as const
              ).map((f) => (
                <label className="order-delivery-field" key={f.name}>
                  {f.label}
                  <input
                    name={f.name}
                    type={"type" in f ? f.type : "text"}
                    required
                    defaultValue={
                      order !== "new"
                        ? order[f.name]
                        : f.name === "date"
                            ? defaultDate
                            : f.name === "time"
                              ? "09:00"
                              : ""
                    }
                  />
                </label>
              ))}
              </section>
              <label className="order-section order-note">
                Ghi chú / nội dung thiệp
                <textarea
                  name="note"
                  rows={6}
                  maxLength={2000}
                  defaultValue={order === "new" ? "" : order.note}
                  placeholder="Lời nhắn cần gửi, yêu cầu đặc biệt…"
                />
              </label>
              </div>
              <div className="order-column order-column-products">
              <OrderProductFields
                order={order}
                products={products}
                onPrice={(value) => setSuggestedPrice({ value })}
              />
              <PaymentFields order={order} suggestedPrice={suggestedPrice} />
              </div>
            </div>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </form>
  );
}
