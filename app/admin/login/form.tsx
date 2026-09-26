"use client";
import { useActionState } from "react";
import { adminLogin } from "../actions";
export default function AdminLoginForm() {
  const [state, action, pending] = useActionState(adminLogin, { error: "" });
  return <main className="admin-login card"><h1>Quản trị nền tảng</h1><p>Đăng nhập dành cho quản trị viên.</p><form action={action}>
    <label>Email<input name="email" type="email" autoComplete="username" required /></label>
    <label>Mật khẩu<input name="password" type="password" autoComplete="current-password" minLength={10} maxLength={128} required /></label>
    {state.error && <p className="error" role="alert">{state.error}</p>}
    <button className="primary" disabled={pending}>{pending ? "Đang đăng nhập…" : "Đăng nhập quản trị"}</button>
  </form></main>;
}
