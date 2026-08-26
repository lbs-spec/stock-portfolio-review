"use client";

import { useEffect, useMemo, useState } from "react";
import type { Trade, TradeAnalysisResult } from "../types";
import { loadTrades, saveTrades } from "../lib/storage";
import { analyzeTrades } from "../lib/trade-analysis";
import { parseTradeXlsx } from "../lib/xlsx-parser";
import ExcelUploader from "./ExcelUploader";
import Modal from "./Modal";

function formatMoney(n: number) {
  return Number(n).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function tradeKey(t: Trade) {
  return `${t.tradeDate}-${t.tradeTime}-${t.code}-${t.volume}-${t.price}`;
}

export default function TradePanel() {
  const [trades, setTrades] = useState<Trade[]>(() => loadTrades());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [pending, setPending] = useState<Trade[] | null>(null);

  const analysis = useMemo<TradeAnalysisResult[]>(() => analyzeTrades(trades), [trades]);

  useEffect(() => {
    saveTrades(trades);
  }, [trades]);

  async function handleImport(file: File) {
    setLoading(true);
    setError("");
    try {
      const imported = await parseTradeXlsx(file);
      setPending(imported);
    } catch (err) {
      setError(err instanceof Error ? err.message : "解析失败");
    } finally {
      setLoading(false);
    }
  }

  function confirmImport() {
    if (!pending) return;
    setTrades((prev) => {
      const existingIds = new Set(prev.map(tradeKey));
      const merged = [...prev];
      let skipped = 0;
      for (const t of pending) {
        const key = tradeKey(t);
        if (!existingIds.has(key)) {
          merged.push(t);
          existingIds.add(key);
        } else {
          skipped++;
        }
      }
      if (skipped > 0) {
        alert(`已跳过 ${skipped} 条重复记录`);
      }
      return merged.sort((a, b) => `${b.tradeDate} ${b.tradeTime}`.localeCompare(`${a.tradeDate} ${a.tradeTime}`));
    });
    setPending(null);
  }

  function cancelImport() {
    setPending(null);
  }

  function handleClear() {
    if (confirm("确定清空所有成交记录？")) {
      setTrades([]);
    }
  }

  const pendingStats = useMemo(() => {
    if (!pending) return null;
    const existingIds = new Set(trades.map(tradeKey));
    let newCount = 0;
    let duplicateCount = 0;
    for (const t of pending) {
      if (existingIds.has(tradeKey(t))) duplicateCount++;
      else newCount++;
    }
    return { total: pending.length, newCount, duplicateCount };
  }, [pending, trades]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">导入东财成交记录</h2>
        <div className="mt-4 max-w-xl">
          <ExcelUploader label="点击或拖拽上传东财成交模板" onFileSelect={handleImport} loading={loading} />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      </section>

      {analysis.length > 0 && (
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">交易合理性分析</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {analysis.map((a) => (
              <div
                key={a.code}
                className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {a.name}（{a.code}）
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      a.realizedProfit >= 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    已实现盈亏 {formatMoney(a.realizedProfit)}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                  <p>买入：{a.totalBuyVolume} 股 / {formatMoney(a.totalBuyAmount)}</p>
                  <p>卖出：{a.totalSellVolume} 股 / {formatMoney(a.totalSellAmount)}</p>
                  <p>买入均价：{a.avgBuyPrice > 0 ? formatMoney(a.avgBuyPrice) : "-"}</p>
                  <p>卖出均价：{a.avgSellPrice > 0 ? formatMoney(a.avgSellPrice) : "-"}</p>
                </div>
                <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">{a.suggestion}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">成交明细</h2>
          <button
            onClick={handleClear}
            className="text-sm text-red-600 hover:text-red-700"
          >
            清空记录
          </button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-300">日期</th>
                <th className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-300">时间</th>
                <th className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-300">代码</th>
                <th className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-300">名称</th>
                <th className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-300">方向</th>
                <th className="px-3 py-2 text-right font-medium text-zinc-600 dark:text-zinc-300">数量</th>
                <th className="px-3 py-2 text-right font-medium text-zinc-600 dark:text-zinc-300">均价</th>
                <th className="px-3 py-2 text-right font-medium text-zinc-600 dark:text-zinc-300">金额</th>
                <th className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-300">市场</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {trades.map((t) => (
                <tr key={t.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-3 py-2">{t.tradeDate}</td>
                  <td className="px-3 py-2">{t.tradeTime}</td>
                  <td className="px-3 py-2 font-medium">{t.code}</td>
                  <td className="px-3 py-2">{t.name}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        t.direction === "买入"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                          : t.direction === "卖出"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                    >
                      {t.direction}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">{t.volume}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(t.price)}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(t.amount)}</td>
                  <td className="px-3 py-2">{t.market}</td>
                </tr>
              ))}
              {trades.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-zinc-400">暂无成交记录</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        open={!!pending}
        title="确认导入成交记录"
        onClose={cancelImport}
        footer={
          <>
            <button
              onClick={cancelImport}
              className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              取消
            </button>
            <button
              onClick={confirmImport}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              确认导入
            </button>
          </>
        }
      >
        {pending && pendingStats && (
          <div className="space-y-4">
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800 p-4 text-sm">
              <p>
                即将导入 <strong>{pendingStats.total}</strong> 条成交记录，其中新增
                <strong className="text-blue-600">{pendingStats.newCount}</strong> 条，重复
                <strong className="text-zinc-500">{pendingStats.duplicateCount}</strong> 条（重复记录将被自动跳过）。
              </p>
            </div>

            <div className="max-h-[45vh] overflow-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-800 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">日期</th>
                    <th className="px-3 py-2 text-left font-medium">时间</th>
                    <th className="px-3 py-2 text-left font-medium">代码</th>
                    <th className="px-3 py-2 text-left font-medium">名称</th>
                    <th className="px-3 py-2 text-left font-medium">方向</th>
                    <th className="px-3 py-2 text-right font-medium">数量</th>
                    <th className="px-3 py-2 text-right font-medium">均价</th>
                    <th className="px-3 py-2 text-right font-medium">金额</th>
                    <th className="px-3 py-2 text-center font-medium">状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {pending.map((t) => {
                    const exists = trades.some((x) => tradeKey(x) === tradeKey(t));
                    return (
                      <tr key={t.id}>
                        <td className="px-3 py-2">{t.tradeDate}</td>
                        <td className="px-3 py-2">{t.tradeTime}</td>
                        <td className="px-3 py-2 font-medium">{t.code}</td>
                        <td className="px-3 py-2">{t.name}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              t.direction === "买入"
                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                : t.direction === "卖出"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                            }`}
                          >
                            {t.direction}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">{t.volume}</td>
                        <td className="px-3 py-2 text-right">{formatMoney(t.price)}</td>
                        <td className="px-3 py-2 text-right">{formatMoney(t.amount)}</td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              exists
                                ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                                : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                            }`}
                          >
                            {exists ? "重复跳过" : "新增"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
