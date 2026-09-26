import { NextRequest, NextResponse } from "next/server";
export function proxy(request: NextRequest) {
  const adminHost = process.env.ADMIN_HOST?.toLowerCase();
  if (!adminHost) return NextResponse.next();
  const host = request.headers.get("host")?.toLowerCase();
  const path = request.nextUrl.pathname;
  if (["/floralhelp-icon.svg", "/floralhelp-logo.svg", "/floralhelp-og.png", "/favicon-32.png", "/apple-touch-icon.png"].includes(path)) return NextResponse.next();
  if (host === adminHost) {
    if (path === "/" || path === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = path === "/" ? "/admin" : "/admin/login";
      return NextResponse.redirect(url);
    }
    if (!path.startsWith("/admin") && !path.startsWith("/_next") && !path.startsWith("/favicon")) return new NextResponse(null, { status: 404 });
  } else if (path === "/admin" || path.startsWith("/admin/")) return new NextResponse(null, { status: 404 });
  return NextResponse.next();
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|favicon.jpg).*)"] };
