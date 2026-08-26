export interface Position {
  id: string;
  code: string; // 证券代码
  name: string; // 证券名称
  quantity: number; // 持仓数量
  available: number; // 可用数量
  costPrice: number; // 成本价
  currentPrice: number; // 最新价
  market: string; // 交易市场
  account: string; // 股东账号
  currency: string; // 币种
  updatedAt: string; // ISO 时间
}

export interface PortfolioSummary {
  totalAsset: number; // 总资产
  availableFund: number; // 可用资金
  withdrawableFund: number; // 可取资金
  marketValue: number; // 证券市值
  totalProfit: number; // 持仓盈亏
  dailyProfit: number; // 当日盈亏参考
  exportedAt?: string; // 导出时间
}

export interface Trade {
  id: string;
  tradeDate: string; // 成交日期
  tradeTime: string; // 成交时间
  code: string; // 证券代码
  name: string; // 证券名称
  direction: "买入" | "卖出" | string; // 委托方向
  volume: number; // 成交数量
  price: number; // 成交均价
  amount: number; // 成交金额
  commission: number; // 佣金
  otherFee: number; // 其他费用
  stampTax: number; // 印花税
  transferFee: number; // 过户费
  market: string; // 交易市场
  account: string; // 股东账号
  currency: string; // 币种
}

export interface TradeAnalysisResult {
  code: string;
  name: string;
  totalBuyVolume: number;
  totalBuyAmount: number;
  totalSellVolume: number;
  totalSellAmount: number;
  netVolume: number;
  avgBuyPrice: number;
  avgSellPrice: number;
  realizedProfit: number;
  // 交易合理性建议
  suggestion: string;
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  tags: string[];
  source?: string;
  createdAt: string;
}

export interface DailyReview {
  id: string;
  date: string;
  marketSummary: string;
  sectorRotation: string;
  positionReview: string;
  tomorrowPlan: string;
  createdAt: string;
}

export type TabKey = "portfolio" | "trades" | "news";
