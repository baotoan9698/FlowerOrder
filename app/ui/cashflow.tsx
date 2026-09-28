"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X, Wallet } from "lucide-react";
import { saveCashEntry, removeCashEntry } from "../actions";
import type { CashView, OrderView } from "@/lib/validation";
import { vietnamToday } from "@/lib/dates";
import MoneyInput from "./money-input";
const money = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + " ₫";
export default function Cashflow({ entries, orders }: { entries: CashView[]; orders: OrderView[] }) {
  const today = vietnamToday();
  const [from, setFrom] = useState(today.slice(0, 7) + "-01");
  const [to, setTo] = useState(today);
  const [datePreset, setDatePreset] = useState("month");
  const [type, setType] = useState("all");
  const [editing, setEditing] = useState<CashView | "new" | null>(null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, start] = useTransition();
  const modal = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  useEffect(() => { if (editing) modal.current?.showModal(); else modal.current?.close(); }, [editing]);
  const invalid = !from || !to || from > to;
  const selected = invalid ? [] : entries.filter((e) => e.date >= from && e.date <= to);
  const income = invalid ? 0 : orders.filter((order) => order.orderDate >= from && order.orderDate <= to).reduce((sum, order) => sum + order.price, 0);
  const allDates = [...entries.map((entry) => entry.date), ...orders.map((order) => order.orderDate)];
  const expense = selected.filter((e) => e.type === "expense").reduce((n, e) => n + e.amount, 0);
  const shown = selected.filter((e) => type === "all" || e.type === type);
  function open(entry: CashView | "new") { setError(""); setAmount(entry === "new" ? "" : String(entry.amount)); setEditing(entry); }
  function run(work: () => Promise<{ error: string }>, message: string) {
    setError(""); start(async () => {
      try { const result = await work(); if (result.error) setError(result.error); else { setEditing(null); setNotice(message); router.refresh(); } }
      catch { setError("Chưa thể lưu thay đổi. Vui lòng thử lại."); }
    });
  }
  return <section className="cashflow-page">
    <div className="page-heading"><div><span className="eyebrow">SỔ THU CHI CỦA SHOP</span><h1>Thu chi</h1><p>Theo dõi các khoản thu và chi theo ngày giao dịch.</p></div><button className="primary" onClick={() => open("new")}><Plus size={18} /> Thêm thu chi</button></div>
    <p className="cash-hint">Tổng thu là doanh thu từ đơn hàng theo ngày đặt, gồm cả tiền chưa thanh toán. Tổng chi lấy từ phiếu chi theo ngày giao dịch. Phiếu thu ghi tay vẫn lưu trong sổ và không cộng thêm vào doanh thu.</p>
    <section className="card report-filters">
      <div className="filters"><button className={datePreset === "today" ? "active" : ""} aria-pressed={datePreset === "today"} onClick={() => { setDatePreset("today"); setFrom(today); setTo(today); }}>Hôm nay</button><button className={datePreset === "month" ? "active" : ""} aria-pressed={datePreset === "month"} onClick={() => { setDatePreset("month"); setFrom(today.slice(0, 7) + "-01"); setTo(today); }}>Tháng này</button><button className={datePreset === "all" ? "active" : ""} aria-pressed={datePreset === "all"} onClick={() => { setDatePreset("all"); setFrom(allDates.reduce((first, date) => date < first ? date : first, today)); setTo(allDates.reduce((last, date) => date > last ? date : last, today)); }}>Tất cả thời gian</button></div>
      <div className="cash-date-range"><label>Từ ngày<input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setDatePreset("custom"); }} /></label><label>Đến ngày<input type="date" value={to} onChange={(e) => { setTo(e.target.value); setDatePreset("custom"); }} /></label></div>
      {invalid && <p className="error" role="alert">Chọn khoảng ngày hợp lệ: từ ngày không sau đến ngày.</p>}
    </section>
    <div className="stats cash-stats">{[["Tổng thu", income, "Doanh thu theo ngày đặt đơn"], ["Tổng chi", expense, "Phiếu chi theo ngày giao dịch"], ["Chênh lệch thu − chi", income - expense, "Doanh thu − Tổng chi trong kỳ"]].map(([label, value, description]) => <article className="stat" key={label}><span>{label}</span><strong>{money(Number(value))}</strong><small>{description}</small></article>)}</div>
    {notice && <p className="notice" role="status">{notice}</p>}{error && !editing && <p className="error" role="alert">{error}</p>}
    <div className="catalog-tools"><h2>Sổ giao dịch ({shown.length})</h2><label>Loại giao dịch<select value={type} onChange={(e) => setType(e.target.value)}><option value="all">Tất cả</option><option value="income">Phiếu thu</option><option value="expense">Phiếu chi</option></select></label></div>
    {!shown.length ? <div className="empty card"><Wallet size={32} /><h3>Chưa có giao dịch phù hợp</h3><p>Thêm phiếu thu hoặc chi để theo dõi dòng tiền của shop.</p></div> : <div className="cash-list">{shown.map((entry) => <article className="card cash-entry" key={entry.id}>
      <div className="cash-entry-main"><span className={`cash-badge ${entry.type}`}>{entry.type === "income" ? "Thu" : "Chi"}</span><div><h3>{entry.title}</h3><small>{entry.date.split("-").reverse().join("/")} · {entry.category}</small>{entry.note && <p>{entry.note}</p>}</div></div>
      <strong className={entry.type === "income" ? "cash-income" : "danger-text"}>{entry.type === "income" ? "+" : "−"}{money(entry.amount)}</strong>
      <div className="product-buttons"><button className="icon-button" aria-label={`Sửa ${entry.title}`} disabled={pending} onClick={() => open(entry)}><Pencil size={17} /></button><button className="icon-button" aria-label={`Xóa ${entry.title}`} disabled={pending} onClick={() => { if (window.confirm(`Xóa phiếu “${entry.title}”?`)) run(() => removeCashEntry(entry.id), "Đã xóa phiếu thu chi."); }}><Trash2 size={17} /></button></div>
    </article>)}</div>}
    <dialog ref={modal} aria-labelledby="cash-title" onCancel={(e) => { if (pending) e.preventDefault(); else setEditing(null); }}><div className="modal-head"><h2 id="cash-title">{editing === "new" ? "Thêm thu chi" : "Sửa phiếu thu chi"}</h2><button className="icon-button" disabled={pending} aria-label="Đóng" onClick={() => setEditing(null)}><X /></button></div>
      {editing && <form key={editing === "new" ? "new" : editing.id} onSubmit={(e) => { e.preventDefault(); const form = new FormData(e.currentTarget); run(() => saveCashEntry(form), "Đã lưu phiếu thu chi."); }}>
        <input type="hidden" name="id" value={editing === "new" ? "" : editing.id} />
        <div className="form-grid"><label>Loại phiếu<select name="type" defaultValue={editing === "new" ? "income" : editing.type}><option value="income">Phiếu thu</option><option value="expense">Phiếu chi</option></select></label><label>Ngày giao dịch<input name="date" type="date" required defaultValue={editing === "new" ? today : editing.date} /></label></div>
        <label>Nội dung<input name="title" required maxLength={160} placeholder="Ví dụ: Thu tiền bán hoa" defaultValue={editing === "new" ? "" : editing.title} /></label>
        <label>Danh mục<input name="category" required maxLength={80} list="cash-categories" placeholder="Ví dụ: Bán hàng, nhập hoa, vận chuyển" defaultValue={editing === "new" ? "" : editing.category} /></label><datalist id="cash-categories">{["Bán hàng", "Nhập hoa", "Phụ kiện", "Vận chuyển", "Mặt bằng", "Nhân sự", "Khác"].map((item) => <option key={item} value={item} />)}</datalist>
        <label>Số tiền (₫)<MoneyInput name="amount" value={amount} onChange={setAmount} /></label>
        <label>Ghi chú<textarea name="note" maxLength={2000} rows={3} defaultValue={editing === "new" ? "" : editing.note} /></label>
        {error && <p className="error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="secondary" disabled={pending} onClick={() => setEditing(null)}>Hủy</button><button className="primary" disabled={pending}>{pending ? "Đang lưu…" : "Lưu phiếu"}</button></div>
      </form>}
    </dialog>
  </section>;
}
