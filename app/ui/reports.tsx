"use client";
import { useState } from "react";
import { Package, Wallet, CircleDollarSign, ReceiptText } from "lucide-react";
import { statuses, type OrderView, type CashView } from "@/lib/validation";
import FinancialReport from "./financial-report";
import { vietnamToday } from "@/lib/dates";
const money = (n: number) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(n) + " ₫";
const displayDate = (s: string) => s.split("-").reverse().join("/");
export default function Reports({ orders, cashEntries }: { orders: OrderView[]; cashEntries: CashView[] }) {
  const [report, setReport] = useState<"sales" | "financial">("sales");
  const today = vietnamToday();
  const [from, setFrom] = useState(today.slice(0, 7) + "-01");
  const [to, setTo] = useState(today);
  const invalid = !from || !to || from > to;
  const selected = invalid
    ? []
    : orders.filter((o) => o.orderDate >= from && o.orderDate <= to);
  const total = selected.reduce((n, o) => n + o.price, 0);
  const paid = selected.reduce((n, o) => n + o.paidAmount, 0);
  const days = new Map<
    string,
    { count: number; total: number; paid: number }
  >();
  selected.forEach((o) => {
    const item = days.get(o.orderDate) ?? { count: 0, total: 0, paid: 0 };
    item.count++;
    item.total += o.price;
    item.paid += o.paidAmount;
    days.set(o.orderDate, item);
  });
  const daily = [...days].sort(([a], [b]) => b.localeCompare(a));
  const peak = Math.max(1, ...daily.map(([, d]) => d.total));
  function preset(value: string) {
    const date = new Date(today + "T00:00:00Z");
    if (value === "today") {
      setFrom(today);
      setTo(today);
    }
    if (value === "week") {
      date.setUTCDate(date.getUTCDate() - 6);
      setFrom(date.toISOString().slice(0, 10));
      setTo(today);
    }
    if (value === "month") {
      setFrom(today.slice(0, 7) + "-01");
      setTo(today);
    }
    if (value === "previous") {
      date.setUTCDate(0);
      setTo(date.toISOString().slice(0, 10));
      setFrom(date.toISOString().slice(0, 7) + "-01");
    }
  }
  const metrics = [
    {
      label: "Số lượng đơn hàng",
      value: selected.length,
      icon: Package,
      tint: "rose",
      sub: "Theo ngày đặt trong khoảng chọn",
    },
    {
      label: "Tổng tiền bán",
      value: money(total),
      icon: CircleDollarSign,
      tint: "purple",
      sub: "Tổng giá trị các đơn đã đặt",
    },
    {
      label: "Đã thu",
      value: money(paid),
      icon: Wallet,
      tint: "green",
      sub: "Tiền đã thu hiện tại của các đơn này",
    },
    {
      label: "Còn phải thu",
      value: money(total - paid),
      icon: ReceiptText,
      tint: "amber",
      sub: "Giá trị đơn trừ tiền đã thanh toán",
    },
  ];
  return (
    <div className="reports">
      <div className="page-heading">
        <div>
          <span className="eyebrow">HIỂU HƠN VỀ SHOP CỦA BẠN</span>
          <h1>{report === "sales" ? "Báo cáo bán hàng" : "Báo cáo tài chính"}</h1>
          <p>{report === "sales" ? "Thống kê theo ngày đặt đơn · Giờ Việt Nam" : "Doanh thu theo ngày đặt · Chi phí theo ngày chi · Giờ Việt Nam"}</p>
        </div>
      </div>
      <div className="filters report-tabs" role="group" aria-label="Loại báo cáo">
        <button className={report === "sales" ? "active" : ""} aria-pressed={report === "sales"} onClick={() => setReport("sales")}>Bán hàng</button>
        <button className={report === "financial" ? "active" : ""} aria-pressed={report === "financial"} onClick={() => setReport("financial")}>Tài chính</button>
      </div>
      <section className="card report-filters">
        <div className="filters">
          {[
            ["today", "Hôm nay"],
            ["week", "7 ngày qua"],
            ["month", "Tháng này"],
            ["previous", "Tháng trước"],
          ].map(([v, label]) => (
            <button key={v} onClick={() => preset(v)}>
              {label}
            </button>
          ))}
        </div>
        <div className="report-range">
          <label>
            {report === "sales" ? "Từ ngày đặt" : "Từ ngày"}
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            {report === "sales" ? "Đến ngày đặt" : "Đến ngày"}
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <p>{!invalid && `${displayDate(from)} – ${displayDate(to)}`}</p>
        </div>
        {invalid && (
          <p className="error" role="alert">
            Chọn ngày bắt đầu không lớn hơn ngày kết thúc.
          </p>
        )}
      </section>
      {!invalid && (report === "financial" ? <FinancialReport orders={selected} expenses={cashEntries.filter((entry) => entry.type === "expense" && entry.date >= from && entry.date <= to)} /> : (
        <>
          <section className="stats">
            {metrics.map((m) => (
              <article className="stat" key={m.label}>
                <div>
                  <span>{m.label}</span>
                  <div className={`stat-icon ${m.tint}`}>
                    <m.icon size={20} />
                  </div>
                </div>
                <strong>{m.value}</strong>
                <small>{m.sub}</small>
              </article>
            ))}
          </section>
          <div className="report-highlights">
            <span>
              Giá trị trung bình/đơn{" "}
              <strong>
                {money(selected.length ? total / selected.length : 0)}
              </strong>
            </span>
            <span>
              Đơn thanh toán đủ{" "}
              <strong>
                {selected.filter((o) => o.paidAmount === o.price).length}/
                {selected.length}
              </strong>
            </span>
            <span>
              Tỷ lệ đã thu{" "}
              <strong>{total ? Math.round((paid / total) * 100) : 0}%</strong>
            </span>
          </div>
          <p className="report-note">
            Tiền đã thu và còn phải thu là số dư hiện tại của các đơn đặt trong
            khoảng chọn, không phải giao dịch thu tiền phát sinh trong ngày.
            Tổng tiền bán bao gồm tất cả trạng thái giao hàng.
          </p>
          <section className="card report-daily">
            <h2>Chi tiết theo ngày đặt</h2>
            {daily.length ? (
              <div className="report-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Ngày đặt</th>
                      <th>Số đơn</th>
                      <th>Tổng tiền bán</th>
                      <th>Đã thu</th>
                      <th>Còn phải thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daily.map(([date, d]) => (
                      <tr key={date}>
                        <th scope="row">{displayDate(date)}</th>
                        <td>{d.count}</td>
                        <td>
                          <strong>{money(d.total)}</strong>
                          <span className="report-bar" aria-hidden="true">
                            <i
                              style={{ width: `${(d.total / peak) * 100}%` }}
                            />
                          </span>
                        </td>
                        <td>{money(d.paid)}</td>
                        <td>{money(d.total - d.paid)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th>Tổng cộng</th>
                      <td>{selected.length}</td>
                      <td>{money(total)}</td>
                      <td>{money(paid)}</td>
                      <td>{money(total - paid)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="empty">
                <Package size={30} />
                <h3>Chưa có đơn trong khoảng ngày này</h3>
                <p>Thử chọn khoảng ngày đặt khác để xem báo cáo.</p>
              </div>
            )}
          </section>
          <section className="card report-status">
            <h2>Trạng thái các đơn đã đặt</h2>
            <div>
              {Object.entries(statuses).map(([key, label]) => (
                <span key={key}>
                  <span className={`badge ${key}`}>{label}</span>
                  <strong>
                    {selected.filter((o) => o.status === key).length} đơn
                  </strong>
                </span>
              ))}
            </div>
          </section>
        </>
      ))}
    </div>
  );
}
