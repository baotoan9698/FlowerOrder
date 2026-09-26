"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteShopAccount } from "./actions";
export default function DeleteShop({ id, email }: { id: string; email: string }) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return <div className="admin-delete-shop">
    {!open ? <button type="button" className="secondary danger-text" onClick={() => setOpen(true)}>Xóa tài khoản shop</button> : <form onSubmit={(event) => {
      event.preventDefault(); if (pending) return;
      const form = new FormData(); form.set("id", id); form.set("email", confirmation);
      start(async () => { try { const result = await deleteShopAccount(form); if (result.error) setError(result.error); else router.refresh(); } catch { setError("Chưa thể hoàn tất xóa shop. Vui lòng thử lại."); } });
    }}>
      <p className="danger-text">Xóa vĩnh viễn tài khoản cùng đơn hàng, khách hàng, sản phẩm, ảnh, thu chi và lịch sử của shop. Không thể hoàn tác.</p>
      <label>Nhập email {email} để xác nhận<input aria-label="Email xác nhận xóa" type="email" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required autoComplete="off" /></label>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="modal-actions"><button type="button" className="secondary" disabled={pending} onClick={() => { setOpen(false); setError(""); setConfirmation(""); }}>Hủy</button><button className="primary" disabled={pending || confirmation.trim().toLowerCase() !== email}>{pending ? "Đang xóa…" : "Xóa vĩnh viễn"}</button></div>
    </form>}
  </div>;
}
