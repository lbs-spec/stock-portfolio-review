import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "持仓管理与复盘",
  description: "A股/港股持仓管理、东方财富模板导入、成交分析与每日复盘",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-zinc-950">{children}</body>
    </html>
  );
}
