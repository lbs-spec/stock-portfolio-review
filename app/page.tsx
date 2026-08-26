"use client";

import { useState } from "react";
import NewsPanel from "./components/NewsPanel";
import PortfolioPanel from "./components/PortfolioPanel";
import TradePanel from "./components/TradePanel";
import type { TabKey } from "./types";

const tabs: { key: TabKey; label: string }[] = [
  { key: "portfolio", label: "持仓管理" },
  { key: "trades", label: "成交分析" },
  { key: "news", label: "消息与复盘" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>("portfolio");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">持仓管理与复盘</h1>
            <p className="text-xs text-zinc-500">A股/港股 · 东方财富模板导入 · 成交分析 · 每日复盘</p>
          </div>
          <nav className="flex gap-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  rounded-lg px-4 py-2 text-sm font-medium transition-colors
                  ${
                    activeTab === tab.key
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-6xl">
          {activeTab === "portfolio" && <PortfolioPanel />}
          {activeTab === "trades" && <TradePanel />}
          {activeTab === "news" && <NewsPanel />}
        </div>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 px-4 py-4 text-center text-xs text-zinc-500">
        数据保存在浏览器本地（localStorage），刷新页面不会丢失。
      </footer>
    </div>
  );
}
