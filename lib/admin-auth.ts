import "server-only";
import { cookies, headers } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { db } from "./db";
const cookie = "flower_admin_session";
const digest = (token: string) => createHash("sha256").update(token).digest("hex");
export async function adminHostAllowed() {
  return !process.env.ADMIN_HOST || (await headers()).get("host")?.toLowerCase() === process.env.ADMIN_HOST.toLowerCase();
}
export async function currentAdmin() {
  if (!(await adminHostAllowed())) return null;
  const token = (await cookies()).get(cookie)?.value;
  if (!token) return null;
  const session = await db.adminSession.findUnique({ where: { id: digest(token) }, include: { admin: true } });
  return session && session.expiresAt > new Date() ? session.admin : null;
}
export async function requireAdmin() {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
export async function createAdminSession(adminId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 8 * 3600000);
  await db.adminSession.create({ data: { id: digest(token), adminId, expiresAt } });
  (await cookies()).set(cookie, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", expires: expiresAt });
}
export async function deleteAdminSession() {
  const jar = await cookies(); const token = jar.get(cookie)?.value;
  if (token) await db.adminSession.deleteMany({ where: { id: digest(token) } });
  jar.delete(cookie);
}
