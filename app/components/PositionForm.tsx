"use client";

import { useState } from "react";
import type { Position } from "../types";

interface PositionFormProps {
  onAdd: (position: Position) => void;
}

export default function PositionForm({ onAdd }: PositionFormProps) {
  const [form, setForm] = useState({
    code: "",
    name: "",
    quantity: "",
    available: "",
    costPrice: "",
    currentPrice: "",
    market: "深市A股",
    account: "",
    currency: "人民币",
  });

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const position: Position = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      code: form.code.trim(),
      name: form.name.trim(),
      quantity: Number(form.quantity) || 0,
      available: Number(form.available) || 0,
      costPrice: Number(form.costPrice) || 0,
      currentPrice: Number(form.currentPrice) || 0,
      market: form.market,
      account: form.account.trim(),
      currency: form.currency,
      updatedAt: new Date().toISOString(),
    };
    onAdd(position);
    setForm({
      code: "",
      name: "",
      quantity: "",
      available: "",
      costPrice: "",
      currentPrice: "",
      market: "深市A股",
      account: "",
      currency: "人民币",
    });
  }

  const inputClass =
    "w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">证券代码</span>
          <input
            required
            value={form.code}
            onChange={(e) => handleChange("code", e.target.value)}
            className={inputClass}
            placeholder="如 300759"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">证券名称</span>
          <input
            required
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className={inputClass}
            placeholder="如 康龙化成"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">持仓数量</span>
          <input
            required
            type="number"
            min={0}
            value={form.quantity}
            onChange={(e) => handleChange("quantity", e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">可用数量</span>
          <input
            required
            type="number"
            min={0}
            value={form.available}
            onChange={(e) => handleChange("available", e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">成本价</span>
          <input
            required
            type="number"
            step="0.001"
            value={form.costPrice}
            onChange={(e) => handleChange("costPrice", e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">最新价</span>
          <input
            required
            type="number"
            step="0.001"
            value={form.currentPrice}
            onChange={(e) => handleChange("currentPrice", e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">交易市场</span>
          <select
            value={form.market}
            onChange={(e) => handleChange("market", e.target.value)}
            className={inputClass}
          >
            <option>深市A股</option>
            <option>沪市A股</option>
            <option>沪港通</option>
            <option>深港通</option>
            <option>港股</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">股东账号</span>
          <input
            value={form.account}
            onChange={(e) => handleChange("account", e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">币种</span>
          <select
            value={form.currency}
            onChange={(e) => handleChange("currency", e.target.value)}
            className={inputClass}
          >
            <option>人民币</option>
            <option>港币</option>
            <option>美元</option>
          </select>
        </label>
      </div>
      <button
        type="submit"
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        添加持仓
      </button>
    </form>
  );
}
