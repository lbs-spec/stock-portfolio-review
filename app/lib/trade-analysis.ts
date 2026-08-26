import type { Trade, TradeAnalysisResult } from "../types";

export function analyzeTrades(trades: Trade[]): TradeAnalysisResult[] {
  const grouped = new Map<string, Trade[]>();
  for (const t of trades) {
    const list = grouped.get(t.code) || [];
    list.push(t);
    grouped.set(t.code, list);
  }

  const results: TradeAnalysisResult[] = [];
  for (const [code, list] of grouped.entries()) {
    const name = list[0]?.name || code;
    const buys = list.filter((t) => t.direction === "买入");
    const sells = list.filter((t) => t.direction === "卖出");

    const totalBuyVolume = buys.reduce((s, t) => s + t.volume, 0);
    const totalBuyAmount = buys.reduce((s, t) => s + t.amount, 0);
    const totalSellVolume = sells.reduce((s, t) => s + t.volume, 0);
    const totalSellAmount = sells.reduce((s, t) => s + t.amount, 0);

    const avgBuyPrice = totalBuyVolume > 0 ? totalBuyAmount / totalBuyVolume : 0;
    const avgSellPrice = totalSellVolume > 0 ? totalSellAmount / totalSellVolume : 0;

    const realizedProfit = totalSellAmount - totalSellVolume * avgBuyPrice;
    const netVolume = totalBuyVolume - totalSellVolume;

    let suggestion = "";
    if (totalBuyVolume === 0 && totalSellVolume > 0) {
      suggestion = "仅有卖出记录，无法评估买入成本。";
    } else if (totalSellVolume === 0) {
      suggestion = "近期只有买入或尚无卖出，建议关注持仓成本与止损位。";
    } else if (avgSellPrice > avgBuyPrice * 1.02) {
      suggestion = "卖出均价高于买入均价，整体盈利离场，策略偏保守。";
    } else if (avgSellPrice < avgBuyPrice * 0.98) {
      suggestion = "卖出均价明显低于买入均价，存在止损或追涨杀跌嫌疑，建议复盘买卖时机。";
    } else {
      suggestion = "买卖均价接近，交易成本可能侵蚀利润，注意控制交易频率。";
    }

    if (netVolume > 0) {
      suggestion += ` 当前净买入 ${netVolume} 股。`;
    } else if (netVolume < 0) {
      suggestion += ` 当前净卖出 ${Math.abs(netVolume)} 股。`;
    }

    results.push({
      code,
      name,
      totalBuyVolume,
      totalBuyAmount,
      totalSellVolume,
      totalSellAmount,
      netVolume,
      avgBuyPrice,
      avgSellPrice,
      realizedProfit,
      suggestion,
    });
  }

  return results.sort((a, b) => b.realizedProfit - a.realizedProfit);
}
