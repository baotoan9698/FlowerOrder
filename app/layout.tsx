import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import "./cartoon.css";
import SessionGuard from "./ui/session-guard";
const nunito = Nunito({ subsets: ["latin", "vietnamese"], display: "swap", variable: "--font-cute" });
export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")),
  title: "Floralhelp · Quản lý shop hoa",
  description: "Lịch giao hoa và quản lý đơn hàng dành riêng cho shop của bạn.",
  icons: { icon: [{ url: "/floralhelp-icon.svg", type: "image/svg+xml" }, { url: "/favicon-32.png", sizes: "32x32", type: "image/png" }], apple: "/apple-touch-icon.png" },
  openGraph: { title: "Floralhelp · Quản lý shop hoa", description: "Chăm hoa bằng tâm. Quản lý bằng Floralhelp.", siteName: "Floralhelp", locale: "vi_VN", type: "website", images: [{ url: "/floralhelp-og.png", width: 1200, height: 630, alt: "Floralhelp — Quản lý shop hoa" }] },
  twitter: { card: "summary_large_image", title: "Floralhelp · Quản lý shop hoa", images: ["/floralhelp-og.png"] },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={nunito.variable}>
      <body><SessionGuard />{children}</body>
    </html>
  );
}
