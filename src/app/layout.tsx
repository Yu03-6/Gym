import type { Metadata, Viewport } from "next";
import "./globals.css";
import localFont from "next/font/local";
const manrope = localFont({
  src: "../../node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2",
  variable: "--font-manrope",
  weight: "200 800",
  display: "swap",
});
const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
export const metadata: Metadata = {
  title: "FitGo · 饮食与训练日志",
  description:
    "记录饮食、训练和身体变化，按自己的节奏进步。数据保存在当前设备。",
  manifest: `${base}/manifest.webmanifest`,
  icons: { icon: `${base}/favicon.svg`, apple: `${base}/icon-512.png` },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "FitGo" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f6f5f1",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={manrope.variable}>
      <body>{children}</body>
    </html>
  );
}
