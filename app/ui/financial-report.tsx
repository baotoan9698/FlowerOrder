import { CircleDollarSign, ReceiptText, TrendingUp } from "lucide-react";
import Link from "next/link";
import type { CashView, OrderView } from "@/lib/validation";

const money = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + " ₫";
const dateLabel = (date: string) => date.split("-").reverse().join("/");

export default function FinancialReport({ orders, expenses }: { orders: OrderView[]; expenses: CashView[] }) {
  const revenue = orders.reduce((sum, order) => sum + order.price, 0);
  const spent = expenses.reduce((sum, entry) => sum + entry.amount, 0);
  const profit = revenue - spent;
  const days = new Map<string, { revenue: number; expense: number }>();
  for (const order of orders) {
    const item = days.get(order.orderDate) ?? { revenue: 0, expense: 0 };
    item.revenue += order.price; days.set(order.orderDate, item);
  }
  const categories = new Map<string, number>();
  for (const entry of expenses) {
    const item = days.get(entry.date) ?? { revenue: 0, expense: 0 };
    item.expense += entry.amount; days.set(entry.date, item);
    categories.set(entry.category, (categories.get(entry.category) ?? 0) + entry.amount);
  }
  const metrics = [
    { label: "Doanh thu", value: revenue, icon: CircleDollarSign, tint: "purple", sub: `${orders.length} đơn theo ngày đặt, gồm cả phần chưa thu` },
    { label: "Tổng chi", value: spent, icon: ReceiptText, tint: "amber", sub: `${expenses.length} phiếu chi theo ngày giao dịch` },
    { label: "Lợi nhuận trước thuế", value: profit, icon: TrendingUp, tint: profit < 0 ? "rose" : "green", sub: profit < 0 ? "Âm trong kỳ · Doanh thu − Tổng chi" : "Doanh thu − Tổng chi" },
  ];
  return <div className="financial-report">
    <section className="stats financial-stats" aria-label="Tổng hợp tài chính">
      {metrics.map((metric) => <article className="stat" key={metric.label}>
        <div><span>{metric.label}</span><div className={`stat-icon ${metric.tint}`}><metric.icon size={20} /></div></div>
        <strong className={metric.label === "Lợi nhuận trước thuế" && profit < 0 ? "danger-text" : ""}>{money(metric.value)}</strong>
        <small>{metric.sub}</small>
      </article>)}
    </section>
    <p className="report-note">Lợi nhuận trước thuế = tổng giá trị đơn đặt trong kỳ − tổng phiếu chi trong kỳ. Doanh thu gồm tất cả trạng thái đơn; phiếu thu trong sổ Thu chi không cộng thêm vào doanh thu. Kết quả phụ thuộc vào các khoản chi đã nhập.</p>
    <section className="card report-daily">
      <h2>Chi tiết tài chính theo ngày</h2>
      {days.size ? <div className="report-table-wrap"><table>
        <thead><tr><th>Ngày</th><th>Doanh thu</th><th>Tổng chi</th><th>Lợi nhuận trước thuế</th></tr></thead>
        <tbody>{[...days].sort(([a], [b]) => b.localeCompare(a)).map(([date, item]) => <tr key={date}>
          <th scope="row">{dateLabel(date)}</th><td>{money(item.revenue)}</td><td>{money(item.expense)}</td><td className={item.revenue < item.expense ? "danger-text" : ""}>{money(item.revenue - item.expense)}</td>
        </tr>)}</tbody>
        <tfoot><tr><th>Tổng cộng</th><td>{money(revenue)}</td><td>{money(spent)}</td><td>{money(profit)}</td></tr></tfoot>
      </table></div> : <div className="empty"><ReceiptText size={30} /><h3>Chưa có dữ liệu tài chính trong kỳ</h3><p>Chọn khoảng ngày khác hoặc thêm đơn hàng và phiếu chi.</p></div>}
    </section>
    <section className="card report-daily financial-categories">
      <div className="section-heading"><h2>Chi theo danh mục</h2><Link className="text-button" href="/cashflow">Mở sổ Thu chi →</Link></div>
      {categories.size ? <div className="financial-category-list">{[...categories].sort((a, b) => b[1] - a[1]).map(([category, amount]) => <div key={category}><span>{category}</span><strong>{money(amount)}</strong></div>)}</div> : <p className="report-note">Chưa có phiếu chi trong khoảng ngày đã chọn.</p>}
    </section>
  </div>;
}
