"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users, Plus, Phone, MapPin, X, Search } from "lucide-react";
import type { CustomerView } from "@/lib/validation";
import { addCustomer } from "../actions";

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().trim();
export default function Customers({ customers }: { customers: CustomerView[] }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerView | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, start] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close(); }, [open]);
  const term = normalize(query);
  const digits = query.replace(/\D/g, "");
  const phoneQuery = /^[+\d ()-]+$/.test(query.trim()) && !!digits;
  const shown = customers.filter((customer) => !term || normalize(`${customer.code} ${customer.name}`).includes(term) || (phoneQuery && customer.phone.replace(/\D/g, "").includes(digits)));
  return <section className="customers-page">
    <div className="page-heading"><div><span className="eyebrow">DANH BẠ RIÊNG CỦA SHOP</span><h1>Khách hàng</h1><p>Lưu thông tin khách để tạo đơn nhanh hơn.</p></div><button className="primary" onClick={() => { setEditing(null); setError(""); setOpen(true); }}><Plus size={18} /> Thêm khách hàng</button></div>
    <div className="catalog-tools"><h2>{customers.length} khách hàng</h2><label className="search"><Search size={18} /><input aria-label="Tìm trong danh bạ khách hàng" placeholder="Tìm mã khách, tên hoặc SĐT…" value={query} onChange={(e) => setQuery(e.target.value)} /></label></div>
    {notice && <p className="notice" role="status">{notice}</p>}
    {shown.length ? <div className="customer-directory">{shown.map((customer) => <article className="card customer-profile" key={customer.id} role="button" tabIndex={0} aria-label={`Sửa khách hàng ${customer.name}`} onClick={() => { setEditing(customer); setError(""); setOpen(true); }} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setEditing(customer); setError(""); setOpen(true); } }}>
      <span className="customer-code-hint">{customer.code}</span><h2>{customer.name}</h2>
      <a href={`tel:${customer.phone}`} onClick={(e) => e.stopPropagation()}><Phone size={15} />{customer.phone}</a>
      <p><MapPin size={15} /><span>{customer.address || "Chưa có địa chỉ"}</span></p>
    </article>)}</div> : <div className="empty card"><Users size={34} /><h3>{customers.length ? "Không tìm thấy khách phù hợp" : "Chưa có khách hàng"}</h3><p>{customers.length ? "Thử tìm bằng tên, mã khách hoặc số điện thoại khác." : "Thêm khách đầu tiên hoặc tạo khách ngay khi lên đơn."}</p></div>}
    <dialog ref={dialog} aria-labelledby="customer-dialog-title" onCancel={(e) => { if (pending) e.preventDefault(); else setOpen(false); }}>
      <div className="modal-head"><h2 id="customer-dialog-title">{editing ? "Sửa khách hàng" : "Thêm khách hàng"}</h2><button className="icon-button" disabled={pending} aria-label="Đóng" onClick={() => setOpen(false)}><X /></button></div>
      {open && <form onSubmit={(e) => {
        e.preventDefault(); const form = new FormData(e.currentTarget); setError("");
        start(async () => { try {
          const result = await addCustomer(form);
          if (result.error) setError(result.error);
          else { setOpen(false); setQuery(""); setNotice(`Đã ${editing ? "cập nhật" : "thêm"} khách hàng ${"code" in result ? result.code : ""}.`); router.refresh(); }
        } catch { setError("Chưa thể lưu khách hàng. Vui lòng thử lại."); } });
      }}>
        <input type="hidden" name="id" value={editing?.id ?? ""} />
        <p className="customer-code-hint">{editing ? editing.code : "Mã khách hàng được cấp tự động khi lưu."}</p>
        <label>Tên khách hàng<input name="name" defaultValue={editing?.name ?? ""} required maxLength={100} autoComplete="off" /></label>
        <label>Số điện thoại<input name="phone" defaultValue={editing?.phone ?? ""} type="tel" required minLength={8} maxLength={20} autoComplete="off" /></label>
        <label>Địa chỉ<input name="address" defaultValue={editing?.address ?? ""} maxLength={300} placeholder="Có thể bổ sung địa chỉ giao khi tạo đơn" /></label>
        <div className="form-grid">
          <label>Email<input name="email" type="email" maxLength={254} defaultValue={editing?.email ?? ""} /></label>
          <label>Ngày sinh<input name="birthday" type="date" defaultValue={editing?.birthday ?? ""} /></label>
          <label>Giới tính<select name="gender" defaultValue={editing?.gender ?? ""}><option value="">Chưa chọn</option><option value="female">Nữ</option><option value="male">Nam</option><option value="other">Khác</option></select></label>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="modal-actions"><button type="button" className="secondary" disabled={pending} onClick={() => setOpen(false)}>Hủy</button><button className="primary" disabled={pending}>{pending ? "Đang lưu…" : "Lưu khách hàng"}</button></div>
      </form>}
    </dialog>
  </section>;
}
