"use client";
import { useState, useTransition } from "react";
import { resetShopPassword } from "./actions";

export default function ResetPassword({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  return <section className="password-panel">
    {!open ? <button type="button" className="secondary" onClick={() => setOpen(true)}>Reset mật khẩu</button> : <>
      {!password ? <>
        <p>Tạo mật khẩu mới và đăng xuất tất cả thiết bị của shop này?</p>
        <div className="modal-actions">
          <button type="button" className="secondary" disabled={pending} onClick={() => { setOpen(false); setMessage(""); }}>Hủy</button>
          <button type="button" className="primary" disabled={pending} onClick={() => start(async () => {
            setMessage("");
            try { const result = await resetShopPassword(id); if (result.password) setPassword(result.password); else setMessage(result.error); }
            catch { setMessage("Chưa nhận được mật khẩu mới. Vui lòng thử reset lại."); }
          })}>{pending ? "Đang reset…" : "Xác nhận reset"}</button>
        </div>
      </> : <>
        <label>Mật khẩu mới của shop<input value={password} readOnly autoComplete="off" onFocus={(event) => event.target.select()} /></label>
        <p>Hãy sao chép để gửi cho chủ shop. Mật khẩu này không hiển thị lại sau khi đóng hoặc tải lại trang.</p>
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={async () => { try { await navigator.clipboard.writeText(password); setMessage("Đã sao chép mật khẩu."); } catch { setMessage("Hãy chọn ô mật khẩu và sao chép thủ công."); } }}>Sao chép</button>
          <button type="button" className="secondary" onClick={() => { setOpen(false); setPassword(""); setMessage(""); }}>Đóng</button>
        </div>
      </>}
      {message && <p role="status">{message}</p>}
    </>}
  </section>;
}
