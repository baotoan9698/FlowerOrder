import "server-only";
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";
import { accessReason } from "./access";
import { redirect } from "next/navigation";
const cookieName = "floralhelp_session";
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password: string, hash: string) {
  const [salt, key] = hash.split(":");
  return timingSafeEqual(
    Buffer.from(key, "hex"),
    scryptSync(password, salt, 64),
  );
}
const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function createSession(shopId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 86400000);
  await db.session.create({ data: { id: digest(token), shopId, expiresAt } });
  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}
export async function shopSessionState() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return { shop: null, reason: "signed-out" };
  const session = await db.session.findUnique({
    where: { id: digest(token) },
    include: { shop: true },
  });
  if (!session) return { shop: null, reason: "signed-out" };
  const reason = accessReason(session.shop);
  if (reason) {
    await db.session.deleteMany({ where: { shopId: session.shopId } });
    return { shop: null, reason };
  }
  if (session.expiresAt <= new Date()) return { shop: null, reason: "signed-out" };
  return { shop: session.shop, reason: null };
}
export async function currentShop() {
  return (await shopSessionState()).shop;
}
export async function requireShop() {
  const { shop, reason } = await shopSessionState();
  if (!shop) redirect(`/login?reason=${encodeURIComponent(reason ?? "signed-out")}`);
  return shop;
}
export async function deleteSession() {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (token) await db.session.deleteMany({ where: { id: digest(token) } });
  if (token) jar.delete(cookieName);
}
