export interface PortfolioSummary {
  id?: number;
  import_batch_id: string;
  exported_at: string | null;
  total_assets: number;
  available_cash: number;
  withdrawable_cash: number;
  market_value: number;
  position_pnl: number;
  daily_pnl: number;
  created_at?: string;
}

export interface Position {
  id?: number;
  code: string;
  name: string;
  quantity: number;
  available_quantity: number;
  cost_price: number;
  latest_price: number | null;
  position_pnl_ratio: number | null;
  position_pnl: number | null;
  daily_pnl_ratio: number | null;
  daily_pnl: number | null;
  avg_buy_price: number | null;
  position_ratio: number | null;
  market_value: number | null;
  market: string;
  currency: string;
  account: string;
  import_batch_id: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Trade {
  id?: number;
  trade_date: string;
  trade_time: string | null;
  code: string;
  name: string;
  direction: 'buy' | 'sell' | string;
  quantity: number;
  price: number;
  amount: number;
  commission: number;
  other_fees: number;
  stamp_tax: number;
  transfer_fee: number;
  cash_balance: number | null;
  share_balance: number | null;
  order_no: string | null;
  trade_no: string | null;
  market: string;
  account: string;
  currency: string;
  created_at?: string;
}

export interface TradeAnalysis {
  id?: number;
  trade_id: number;
  rule_score: number | null;
  rule_reasoning: string | null;
  ai_score: number | null;
  ai_reasoning: string | null;
  is_reasonable: boolean | null;
  verdict: 'reasonable' | 'caution' | 'unreasonable' | null;
  created_at?: string;
  updated_at?: string;
}

export type ReviewType =
  | 'pre_market_news'
  | 'position_news'
  | 'daily_review'
  | 'latest_market_news';

export interface Review {
  id?: number;
  type: ReviewType;
  title: string | null;
  content: string;
  source: string;
  generated_at: string;
  metadata: string | null;
}

export interface AISettings {
  id?: number;
  key: string;
  value: string;
  updated_at?: string;
}

export interface QuoteData {
  code: string;
  name: string;
  price: number;
  changePercent: number;
  change: number;
  updateTime?: string;
}

export interface NewsItem {
  title: string;
  url: string;
  source: string;
  publishTime: string;
}

export interface ParsedPositionFile {
  summary: PortfolioSummary;
  positions: Position[];
}

export interface ParsedTradeFile {
  trades: Trade[];
}
