import type { DailyReview, NewsItem, Position, PortfolioSummary, Trade } from "../types";

const KEYS = {
  positions: "spr.positions",
  summary: "spr.summary",
  trades: "spr.trades",
  news: "spr.news",
  review: "spr.review",
};

export function loadPositions(): Position[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEYS.positions) || "[]");
  } catch {
    return [];
  }
}

export function savePositions(positions: Position[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.positions, JSON.stringify(positions));
}

export function loadSummary(): PortfolioSummary | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(KEYS.summary) || "null");
  } catch {
    return null;
  }
}

export function saveSummary(summary: PortfolioSummary | null) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.summary, JSON.stringify(summary));
}

export function loadTrades(): Trade[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEYS.trades) || "[]");
  } catch {
    return [];
  }
}

export function saveTrades(trades: Trade[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.trades, JSON.stringify(trades));
}

export function loadNews(): NewsItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEYS.news) || "[]");
  } catch {
    return [];
  }
}

export function saveNews(news: NewsItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.news, JSON.stringify(news));
}

export function loadReview(): DailyReview | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(KEYS.review) || "null");
  } catch {
    return null;
  }
}

export function saveReview(review: DailyReview | null) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.review, JSON.stringify(review));
}

export function clearAll() {
  if (typeof window === "undefined") return;
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}
