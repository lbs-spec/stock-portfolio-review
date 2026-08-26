import * as XLSX from "xlsx";
import type { PortfolioSummary, Position, Trade } from "../types";

function safeNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/,/g, "").trim();
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function safeString(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function parsePositionXlsx(file: File): Promise<{
  summary: PortfolioSummary;
  positions: Position[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];

        if (rows.length < 5) {
          throw new Error("持仓模板格式不正确，数据行不足");
        }

        const summaryRow = rows[1] as unknown[];
        const summary: PortfolioSummary = {
          totalAsset: safeNumber(summaryRow[1]),
          availableFund: safeNumber(summaryRow[2]),
          withdrawableFund: safeNumber(summaryRow[3]),
          marketValue: safeNumber(summaryRow[4]),
          totalProfit: safeNumber(summaryRow[5]),
          dailyProfit: safeNumber(summaryRow[6]),
          exportedAt: safeString(summaryRow[0]),
        };

        const headerIndex = 3;
        const positions: Position[] = [];
        for (let i = headerIndex + 1; i < rows.length; i++) {
          const row = rows[i] as unknown[];
          if (!row[1] && !row[2]) continue; // 跳过空行
          positions.push({
            id: generateId(),
            code: safeString(row[1]),
            name: safeString(row[2]),
            quantity: safeNumber(row[3]),
            available: safeNumber(row[4]),
            costPrice: safeNumber(row[5]),
            currentPrice: safeNumber(row[6]),
            market: safeString(row[14]),
            account: safeString(row[15]),
            currency: safeString(row[16]),
            updatedAt: new Date().toISOString(),
          });
        }

        resolve({ summary, positions });
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };
    reader.onerror = () => reject(new Error("读取文件失败"));
    reader.readAsArrayBuffer(file);
  });
}

export function parseTradeXlsx(file: File): Promise<Trade[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];

        if (rows.length < 2) {
          throw new Error("成交模板格式不正确，数据行不足");
        }

        const trades: Trade[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i] as unknown[];
          if (!row[2] && !row[3]) continue;

          const directionRaw = safeString(row[4]);
          const direction = directionRaw.includes("买") ? "买入" : directionRaw.includes("卖") ? "卖出" : directionRaw;

          trades.push({
            id: generateId(),
            tradeDate: safeString(row[0]),
            tradeTime: safeString(row[1]),
            code: safeString(row[2]),
            name: safeString(row[3]),
            direction,
            volume: safeNumber(row[5]),
            price: safeNumber(row[6]),
            amount: safeNumber(row[7]),
            commission: safeNumber(row[8]),
            otherFee: safeNumber(row[9]),
            stampTax: safeNumber(row[10]),
            transferFee: safeNumber(row[11]),
            market: safeString(row[16]),
            account: safeString(row[17]),
            currency: safeString(row[18]),
          });
        }

        resolve(trades);
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };
    reader.onerror = () => reject(new Error("读取文件失败"));
    reader.readAsArrayBuffer(file);
  });
}
