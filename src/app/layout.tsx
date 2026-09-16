import type { Metadata, Viewport } from "next";
import "./globals.css";
import localFont from "next/font/local";
const barlow = localFont({
  src: [
    { path: "../fonts/barlow-400.woff2", weight: "400" },
    { path: "../fonts/barlow-600.woff2", weight: "600" },
    { path: "../fonts/barlow-800.woff2", weight: "800" },
  ],
  variable: "--font-barlow",
  display: "swap",
});
const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
export const metadata: Metadata = {
  title: "Gym · 饮食与训练日志",
  description:
    "记录饮食、训练和身体变化，按自己的节奏进步。数据保存在当前设备。",
  manifest: `${base}/manifest.webmanifest`,
  icons: { icon: `${base}/favicon.svg`, apple: `${base}/icon-512.png` },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Gym" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f6f5f1",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={barlow.variable}>
      <body>{children}</body>
    </html>
  );
}
