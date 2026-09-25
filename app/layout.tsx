import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import "./cartoon.css";
const nunito = Nunito({ subsets: ["latin", "vietnamese"], display: "swap", variable: "--font-cute" });
export const metadata: Metadata = {
  title: "Elegant Order · Quản lý shop hoa",
  description: "Lịch giao hoa và quản lý đơn hàng dành riêng cho shop của bạn.",
  icons: { icon: "/favicon.jpg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={nunito.variable}>
      <body>{children}</body>
    </html>
  );
}
