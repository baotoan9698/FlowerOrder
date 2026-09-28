"use client";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { X } from "lucide-react";
import { changeShopPassword } from "../actions";

export default function ChangePassword() {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (open) dialog.current?.showModal();
  }, [open]);
  function close() {
    if (pending) return;
    dialog.current?.close();
    setOpen(false);
    setError("");
  }
  return <section className="password-panel">
    <button type="button" className="secondary" onClick={() => setOpen(true)}>Đổi mật khẩu</button>
    {open && <dialog ref={dialog} className="change-password-modal" aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); event.stopPropagation(); close(); }}
      onClick={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) close(); }}>
    <div className="modal-head"><h2 id={titleId}>Đổi mật khẩu</h2><button type="button" className="icon-button" aria-label="Đóng đổi mật khẩu" disabled={pending} onClick={close}><X /></button></div>
    <p>Sau khi đổi mật khẩu, bạn cần đăng nhập lại trên các thiết bị.</p>
    <form onSubmit={(event) => {
      event.preventDefault(); if (pending) return;
      const form = new FormData(event.currentTarget);
      setError("");
      start(async () => {
        try {
          const result = await changeShopPassword(form);
          if (result.error) setError(result.error);
          else window.location.replace("/login?reason=password-changed");
        } catch { setError("Chưa thể đổi mật khẩu. Vui lòng thử lại."); }
      });
    }}>
      <label>Mật khẩu hiện tại<input name="currentPassword" type="password" autoComplete="current-password" maxLength={128} required /></label>
      <label>Mật khẩu mới<input name="newPassword" type="password" autoComplete="new-password" minLength={10} maxLength={128} required placeholder="Từ 10 đến 128 ký tự" /></label>
      <label>Nhập lại mật khẩu mới<input name="confirmPassword" type="password" autoComplete="new-password" minLength={10} maxLength={128} required /></label>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="modal-actions"><button type="button" className="secondary" disabled={pending} onClick={close}>Hủy</button><button className="primary" disabled={pending}>{pending ? "Đang đổi…" : "Đổi mật khẩu"}</button></div>
    </form>
    </dialog>}
  </section>;
}
