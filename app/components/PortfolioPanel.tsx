"use client";

import { useEffect, useMemo, useState } from "react";
import type { PortfolioSummary, Position } from "../types";
import { loadPositions, loadSummary, savePositions, saveSummary } from "../lib/storage";
import { parsePositionXlsx } from "../lib/xlsx-parser";
import ExcelUploader from "./ExcelUploader";
import Modal from "./Modal";
import PositionForm from "./PositionForm";

function formatMoney(n: number) {
  return Number(n).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPct(n: number) {
  return `${(n * 100).toFixed(2)}%`;
}

export default function PortfolioPanel() {
  const [positions, setPositions] = useState<Position[]>(() => loadPositions());
  const [summary, setSummary] = useState<PortfolioSummary | null>(() => loadSummary());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [pending, setPending] = useState<{
    summary: PortfolioSummary;
    positions: Position[];
    newCount: number;
    updateCount: number;
  } | null>(null);

  useEffect(() => {
    savePositions(positions);
  }, [positions]);

  useEffect(() => {
    saveSummary(summary);
  }, [summary]);

  const derived = useMemo(() => {
    const totalCost = positions.reduce((s, p) => s + p.quantity * p.costPrice, 0);
    const totalMarket = positions.reduce((s, p) => s + p.quantity * p.currentPrice, 0);
    const totalProfit = totalMarket - totalCost;
    const profitPct = totalCost > 0 ? totalProfit / totalCost : 0;
    return { totalCost, totalMarket, totalProfit, profitPct };
  }, [positions]);

  function handleAdd(position: Position) {
    setPositions((prev) => {
      const idx = prev.findIndex((p) => p.code === position.code && p.account === position.account);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...position, id: next[idx].id };
        return next;
      }
      return [position, ...prev];
    });
  }

  function handleDelete(id: string) {
    setPositions((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleImport(file: File) {
    setLoading(true);
    setError("");
    try {
      const { summary: s, positions: ps } = await parsePositionXlsx(file);

      let newCount = 0;
      let updateCount = 0;
      for (const p of ps) {
        const exists = positions.some((x) => x.code === p.code && x.account === p.account);
        if (exists) updateCount++;
        else newCount++;
      }

      setPending({ summary: s, positions: ps, newCount, updateCount });
    } catch (err) {
      setError(err instanceof Error ? err.message : "解析失败");
    } finally {
      setLoading(false);
    }
  }

  function confirmImport() {
    if (!pending) return;
    setSummary(pending.summary);
    setPositions((prev) => {
      const next = [...prev];
      for (const p of pending.positions) {
        const idx = next.findIndex((x) => x.code === p.code && x.account === p.account);
        if (idx >= 0) {
          next[idx] = p;
        } else {
          next.push(p);
        }
      }
      return next;
    });
    setPending(null);
  }

  function cancelImport() {
    setPending(null);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">账户概览</h2>
        {summary ? (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <Card label="总资产" value={formatMoney(summary.totalAsset)} />
            <Card label="可用资金" value={formatMoney(summary.availableFund)} />
            <Card label="证券市值" value={formatMoney(summary.marketValue)} />
            <Card
              label="持仓盈亏"
              value={formatMoney(summary.totalProfit)}
              valueClass={summary.totalProfit >= 0 ? "text-red-600" : "text-green-600"}
            />
            <Card
              label="当日盈亏"
              value={formatMoney(summary.dailyProfit)}
              valueClass={summary.dailyProfit >= 0 ? "text-red-600" : "text-green-600"}
            />
            <Card label="导出时间" value={summary.exportedAt || "-"} />
          </div>
        ) : (
          <p className="mt-4 text-sm text-zinc-500">导入持仓模板后将显示账户概览。</p>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">导入东方财富持仓</h2>
        <div className="mt-4 max-w-xl">
          <ExcelUploader label="点击或拖拽上传东方财富持仓模板" onFileSelect={handleImport} loading={loading} />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">手动录入 / 修改持仓</h2>
        <div className="mt-4">
          <PositionForm onAdd={handleAdd} />
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">持仓明细</h2>
          <div className="text-sm text-zinc-500">
            成本合计：<span className="font-medium text-zinc-900 dark:text-zinc-100">{formatMoney(derived.totalCost)}</span>
            <span className="mx-2">·</span>
            市值合计：<span className="font-medium text-zinc-900 dark:text-zinc-100">{formatMoney(derived.totalMarket)}</span>
            <span className="mx-2">·</span>
            盈亏：
            <span className={`font-medium ${derived.totalProfit >= 0 ? "text-red-600" : "text-green-600"}`}>
              {formatMoney(derived.totalProfit)}（{formatPct(derived.profitPct)}）
            </span>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-300">代码</th>
                <th className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-300">名称</th>
                <th className="px-3 py-2 text-right font-medium text-zinc-600 dark:text-zinc-300">持仓</th>
                <th className="px-3 py-2 text-right font-medium text-zinc-600 dark:text-zinc-300">可用</th>
                <th className="px-3 py-2 text-right font-medium text-zinc-600 dark:text-zinc-300">成本价</th>
                <th className="px-3 py-2 text-right font-medium text-zinc-600 dark:text-zinc-300">最新价</th>
                <th className="px-3 py-2 text-right font-medium text-zinc-600 dark:text-zinc-300">盈亏</th>
                <th className="px-3 py-2 text-right font-medium text-zinc-600 dark:text-zinc-300">盈亏比</th>
                <th className="px-3 py-2 text-right font-medium text-zinc-600 dark:text-zinc-300">市值</th>
                <th className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-300">市场</th>
                <th className="px-3 py-2 text-center font-medium text-zinc-600 dark:text-zinc-300">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {positions.map((p) => {
                const profit = (p.currentPrice - p.costPrice) * p.quantity;
                const profitPct = p.costPrice > 0 ? (p.currentPrice - p.costPrice) / p.costPrice : 0;
                const marketValue = p.currentPrice * p.quantity;
                return (
                  <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-3 py-2 font-medium">{p.code}</td>
                    <td className="px-3 py-2">{p.name}</td>
                    <td className="px-3 py-2 text-right">{p.quantity}</td>
                    <td className="px-3 py-2 text-right">{p.available}</td>
                    <td className="px-3 py-2 text-right">{formatMoney(p.costPrice)}</td>
                    <td className="px-3 py-2 text-right">{formatMoney(p.currentPrice)}</td>
                    <td className={`px-3 py-2 text-right ${profit >= 0 ? "text-red-600" : "text-green-600"}`}>
                      {formatMoney(profit)}
                    </td>
                    <td className={`px-3 py-2 text-right ${profitPct >= 0 ? "text-red-600" : "text-green-600"}`}>
                      {formatPct(profitPct)}
                    </td>
                    <td className="px-3 py-2 text-right">{formatMoney(marketValue)}</td>
                    <td className="px-3 py-2">{p.market}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                );
              })}
              {positions.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-zinc-400">暂无持仓数据</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        open={!!pending}
        title="确认导入持仓"
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
        {pending && (
          <div className="space-y-4">
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800 p-4 text-sm">
              <p>
                即将导入 <strong>{pending.positions.length}</strong> 条持仓记录，其中新增
                <strong className="text-blue-600">{pending.newCount}</strong> 条，更新
                <strong className="text-amber-600">{pending.updateCount}</strong> 条。
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <CardSmall label="总资产" value={formatMoney(pending.summary.totalAsset)} />
                <CardSmall label="可用资金" value={formatMoney(pending.summary.availableFund)} />
                <CardSmall label="证券市值" value={formatMoney(pending.summary.marketValue)} />
                <CardSmall
                  label="持仓盈亏"
                  value={formatMoney(pending.summary.totalProfit)}
                  valueClass={pending.summary.totalProfit >= 0 ? "text-red-600" : "text-green-600"}
                />
                <CardSmall
                  label="当日盈亏"
                  value={formatMoney(pending.summary.dailyProfit)}
                  valueClass={pending.summary.dailyProfit >= 0 ? "text-red-600" : "text-green-600"}
                />
                <CardSmall label="导出时间" value={pending.summary.exportedAt || "-"} />
              </div>
            </div>

            <div className="max-h-[40vh] overflow-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-800 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">代码</th>
                    <th className="px-3 py-2 text-left font-medium">名称</th>
                    <th className="px-3 py-2 text-right font-medium">持仓</th>
                    <th className="px-3 py-2 text-right font-medium">成本价</th>
                    <th className="px-3 py-2 text-right font-medium">最新价</th>
                    <th className="px-3 py-2 text-left font-medium">市场</th>
                    <th className="px-3 py-2 text-center font-medium">类型</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {pending.positions.map((p) => {
                    const exists = positions.some(
                      (x) => x.code === p.code && x.account === p.account
                    );
                    return (
                      <tr key={p.id}>
                        <td className="px-3 py-2 font-medium">{p.code}</td>
                        <td className="px-3 py-2">{p.name}</td>
                        <td className="px-3 py-2 text-right">{p.quantity}</td>
                        <td className="px-3 py-2 text-right">{formatMoney(p.costPrice)}</td>
                        <td className="px-3 py-2 text-right">{formatMoney(p.currentPrice)}</td>
                        <td className="px-3 py-2">{p.market}</td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              exists
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                            }`}
                          >
                            {exists ? "更新" : "新增"}
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

function Card({
  label,
  value,
  valueClass = "text-zinc-900 dark:text-zinc-100",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800 p-3">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}

function CardSmall({
  label,
  value,
  valueClass = "text-zinc-900 dark:text-zinc-100",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg bg-white dark:bg-zinc-900 p-2">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`text-sm font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}
