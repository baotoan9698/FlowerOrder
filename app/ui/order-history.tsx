import { History } from "lucide-react";
import type { OrderHistoryView } from "@/lib/order-history";
const timestamp = (value: string) => {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("day")}/${part("month")}/${part("year")} ${part("hour")}:${part("minute")}:${part("second")}`;
};

export default function OrderHistory({ history }: { history: OrderHistoryView[] }) {
  return <section className="order-history card" aria-label="Lịch sử thay đổi đơn hàng">
    <h2><History size={20} />Lịch sử thay đổi <span>{history.length}</span></h2>
    {!history.length ? <p className="history-empty">Chưa có lịch sử được ghi nhận. Các thay đổi từ lần lưu tiếp theo sẽ xuất hiện ở đây.</p> : <div className="history-list">
      {history.map((entry) => entry.action === "created" ? <div className="history-entry" key={entry.id}>
        <span className="history-heading"><strong>Tạo đơn hàng</strong><time dateTime={entry.createdAt}>{timestamp(entry.createdAt)}</time><span><b>{entry.actorName}</b> · {entry.actorEmail}</span></span>
      </div> : <details className="history-entry" key={entry.id}>
        <summary><span className="history-heading"><strong>{entry.action === "created" ? "Tạo đơn hàng" : "Cập nhật đơn hàng"}</strong><time dateTime={entry.createdAt}>{timestamp(entry.createdAt)}</time><span><b>{entry.actorName}</b> · {entry.actorEmail}</span></span></summary>
        <div className="history-changes">{entry.changes.map((change) => <div className="history-change" key={change.field}>
          <strong>{change.field}</strong>
          <div>{entry.action !== "created" && <span className="history-before"><small>Trước</small>{change.before || "Trống"}</span>}<span className="history-after"><small>{entry.action === "created" ? "Giá trị" : "Sau"}</small>{change.after || "Trống"}</span></div>
        </div>)}</div>
      </details>)}
    </div>}
  </section>;
}
