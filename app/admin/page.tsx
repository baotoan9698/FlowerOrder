import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { accessReason } from "@/lib/access";
import { adminLogout } from "./actions";
import ShopAccessForm from "./shop-access-form";
import DeleteShop from "./delete-shop";
import ResetPassword from "./reset-password";
const labels: Record<string, string> = { active: "Đang hoạt động", expired: "Hết hạn", pending: "Chờ duyệt", suspended: "Tạm khóa", rejected: "Từ chối" };
const date = (value: Date) => new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" }).format(value);
export default async function AdminPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const admin = await requireAdmin();
  const { q = "" } = await searchParams;
  const shops = await db.shop.findMany({ where: q ? { OR: [{ name: { contains: q.slice(0, 100) } }, { email: { contains: q.slice(0, 100) } }] } : {}, orderBy: { createdAt: "desc" }, take: 100, include: { _count: { select: { orders: true, customers: true, products: true } }, adminEvents: { take: 5, orderBy: { createdAt: "desc" }, include: { admin: { select: { name: true } } } } } });
  return <main className="admin-page"><header><div><h1>Quản trị shop</h1><p>{admin.name} · {admin.email}</p></div><form action={adminLogout}><button className="secondary">Đăng xuất admin</button></form></header>
    <form className="admin-search"><input name="q" aria-label="Tìm shop" placeholder="Tên shop hoặc email…" defaultValue={q} /><button className="secondary">Tìm kiếm</button></form>
    <p>Hiển thị tối đa 100 shop. Thời hạn được tính theo giờ Việt Nam.</p>
    <div className="admin-shop-grid">{shops.map((shop) => <article className="card admin-shop" key={shop.id}>
      <div className="admin-shop-heading"><div><h2>{shop.name}</h2><p>{shop.email}</p></div><strong className={`badge admin-status admin-status-${accessReason(shop) ?? "active"}`}>{labels[accessReason(shop) ?? "active"]}</strong></div>
      <p>Đăng ký: {date(shop.createdAt)}</p><p>Hết hạn: {shop.accessUntil ? date(shop.accessUntil) : "Chưa đặt hạn (shop cũ)"}</p>
      <p>{shop._count.orders} đơn · {shop._count.products} sản phẩm · {shop._count.customers} khách hàng</p>
      <ShopAccessForm id={shop.id} status={shop.accessStatus} until={shop.accessUntil ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(shop.accessUntil) : ""} />
      <details><summary>Lịch sử quản trị gần đây</summary>{shop.adminEvents.map((entry) => { const change = JSON.parse(entry.details); return <p key={entry.id}>{date(entry.createdAt)} · {entry.admin.name}<br />{change.type === "password-reset" ? "Đã reset mật khẩu shop" : <>{labels[change.before.status]} → {labels[change.after.status]}<br />Hạn cũ: {change.before.until ? date(new Date(change.before.until)) : "Chưa đặt"} → {change.after.until ? date(new Date(change.after.until)) : "?"}</>}</p>; })}{!shop.adminEvents.length && <p>Chưa có thay đổi.</p>}</details>
      <ResetPassword id={shop.id} />
      <DeleteShop id={shop.id} email={shop.email} />
    </article>)}</div>{!shops.length && <p>Không tìm thấy shop.</p>}
  </main>;
}
