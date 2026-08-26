"use client";

import { useEffect, useMemo, useState } from "react";
import type { DailyReview, NewsItem } from "../types";
import { loadNews, loadPositions, loadReview, saveNews, saveReview } from "../lib/storage";

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface FetchedNewsItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
}

interface FetchedNewsPayload {
  items: FetchedNewsItem[];
  debug?: { source?: string; count?: number; url?: string; status?: number; error?: string }[];
  fetchedAt?: string;
  demo?: boolean;
}

export default function NewsPanel() {
  const [news, setNews] = useState<NewsItem[]>(() => loadNews());
  const [review, setReview] = useState<DailyReview | null>(() => loadReview());
  const [loading, setLoading] = useState({
    preMarket: false,
    holding: false,
    latest: false,
    review: false,
  });
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"news" | "review">("news");
  const [demoMode, setDemoMode] = useState<boolean | null>(null);

  const positions = useMemo(() => loadPositions(), []);
  const holdingNames = useMemo(
    () => positions.map((p) => p.name).filter(Boolean),
    [positions]
  );

  useEffect(() => {
    saveNews(news);
  }, [news]);

  useEffect(() => {
    saveReview(review);
  }, [review]);

  function showError(msg: string) {
    setError(msg);
    setTimeout(() => setError(""), 6000);
  }

  async function fetchNews(type: "market" | "holding", keywords?: string): Promise<FetchedNewsPayload> {
    const params = new URLSearchParams({ type });
    if (keywords) params.set("keywords", keywords);
    const res = await fetch(`/api/news?${params.toString()}`);
    const data = (await res.json()) as FetchedNewsPayload & { error?: string };
    if (!res.ok || data.error) throw new Error(data.error || "拉取消息失败");
    return data;
  }

  function createNewsItem(
    label: string,
    payload: FetchedNewsPayload,
    tags: string[]
  ): NewsItem {
    const now = new Date().toLocaleString("zh-CN");
    return {
      id: generateId(),
      title: `${label} ${now}`,
      content: JSON.stringify({
        items: payload.items,
        fetchedAt: payload.fetchedAt || new Date().toISOString(),
        demo: payload.demo,
      }),
      tags,
      source: [...new Set(payload.items.map((i) => i.source))].join(", ") || "本地",
      createdAt: new Date().toISOString(),
    };
  }

  function parseContent(item: NewsItem): {
    items: FetchedNewsItem[];
    fetchedAt?: string;
    demo?: boolean;
  } {
    try {
      return JSON.parse(item.content) as {
        items: FetchedNewsItem[];
        fetchedAt?: string;
        demo?: boolean;
      };
    } catch {
      return {
        items: [
          {
            title: item.title,
            description: item.content,
            link: "#",
            pubDate: item.createdAt,
            source: item.source || "本地",
          },
        ],
      };
    }
  }

  async function updatePreMarketNews() {
    setLoading((p) => ({ ...p, preMarket: true }));
    try {
      const payload = await fetchNews("market");
      setDemoMode(payload.demo ?? null);
      setNews((prev) => [createNewsItem("盘前市场消息", payload, ["盘前", "宏观"]), ...prev.filter((n) => !n.tags.includes("盘前"))]);
    } catch (err) {
      showError(err instanceof Error ? err.message : "拉取失败");
    } finally {
      setLoading((p) => ({ ...p, preMarket: false }));
    }
  }

  async function updateHoldingNews() {
    if (holdingNames.length === 0) {
      showError("暂无持仓，请先导入或录入持仓后再拉取相关消息。");
      return;
    }
    setLoading((p) => ({ ...p, holding: true }));
    try {
      const keywords = holdingNames.join(",");
      const payload = await fetchNews("holding", keywords);
      setDemoMode(payload.demo ?? null);
      setNews((prev) => [createNewsItem("持仓相关消息", payload, ["持仓相关"]), ...prev.filter((n) => !n.tags.includes("持仓相关"))]);
    } catch (err) {
      showError(err instanceof Error ? err.message : "拉取失败");
    } finally {
      setLoading((p) => ({ ...p, holding: false }));
    }
  }

  async function updateLatestNews() {
    setLoading((p) => ({ ...p, latest: true }));
    try {
      const payload = await fetchNews("market");
      setDemoMode(payload.demo ?? null);
      setNews((prev) => [createNewsItem("最新市场消息", payload, ["最新", "市场"]), ...prev.filter((n) => !n.tags.includes("最新"))]);
    } catch (err) {
      showError(err instanceof Error ? err.message : "拉取失败");
    } finally {
      setLoading((p) => ({ ...p, latest: false }));
    }
  }

  async function updateReview() {
    setLoading((p) => ({ ...p, review: true }));
    try {
      const marketNews = news.filter(
        (n) => n.tags.includes("盘前") || n.tags.includes("最新") || n.tags.includes("持仓相关")
      );
      const payload = {
        date: new Date().toLocaleDateString("zh-CN"),
        positions: positions.map((p) => ({
          code: p.code,
          name: p.name,
          quantity: p.quantity,
          costPrice: p.costPrice,
          currentPrice: p.currentPrice,
        })),
        news: marketNews.flatMap((n) => parseContent(n).items.map((i) => ({ title: i.title, description: i.description, source: i.source }))),
      };

      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = (await res.json()) as { error?: string };
        throw new Error(errData.error || "生成复盘失败");
      }
      const data = (await res.json()) as DailyReview & { demo?: boolean };

      setReview({
        id: generateId(),
        date: new Date().toLocaleDateString("zh-CN"),
        marketSummary: data.marketSummary || "",
        sectorRotation: data.sectorRotation || "",
        positionReview: data.positionReview || "",
        tomorrowPlan: data.tomorrowPlan || "",
        createdAt: new Date().toISOString(),
      });
      setActiveTab("review");
    } catch (err) {
      showError(err instanceof Error ? err.message : "生成失败");
    } finally {
      setLoading((p) => ({ ...p, review: false }));
    }
  }

  function updateReviewField(field: keyof DailyReview, value: string) {
    setReview((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  function deleteNews(id: string) {
    setNews((prev) => prev.filter((n) => n.id !== id));
  }

  const preMarket = news.find((n) => n.tags.includes("盘前"));
  const holdingNews = news.find((n) => n.tags.includes("持仓相关"));
  const latestNews = news.filter((n) => n.tags.includes("最新"));

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <ConfigNotice demoMode={demoMode} />

      {/* 标签切换 */}
      <section className="rounded-xl bg-white dark:bg-zinc-900 p-2 shadow-sm">
        <div className="flex gap-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1">
          <TabButton active={activeTab === "news"} onClick={() => setActiveTab("news")}>
            消息中心
          </TabButton>
          <TabButton active={activeTab === "review"} onClick={() => setActiveTab("review")}>
            当日复盘
          </TabButton>
        </div>
      </section>

      {activeTab === "news" ? (
        <div className="space-y-6">
          <NewsSection
            title="盘前市场消息"
            icon="🌅"
            news={preMarket || null}
            holdingNames={holdingNames}
            onDelete={() => preMarket && deleteNews(preMarket.id)}
            emptyHint="点击右侧「更新」按钮拉取最新盘前资讯。"
            action={
              <ActionButton onClick={updatePreMarketNews} loading={loading.preMarket}>
                更新盘前消息
              </ActionButton>
            }
          />

          <NewsSection
            title="持仓相关消息"
            icon="📈"
            news={holdingNews || null}
            holdingNames={holdingNames}
            onDelete={() => holdingNews && deleteNews(holdingNews.id)}
            emptyHint={
              holdingNames.length > 0
                ? `当前持仓：${holdingNames.join("、")}。点击右侧「更新」按钮拉取相关资讯。`
                : "暂无持仓，请先导入或录入持仓。"
            }
            action={
              <ActionButton onClick={updateHoldingNews} loading={loading.holding}>
                更新持仓消息
              </ActionButton>
            }
          />

          <NewsSection
            title="最新市场消息"
            icon="🔥"
            news={latestNews.length > 0 ? latestNews[0] : null}
            holdingNames={holdingNames}
            onDelete={() => latestNews[0] && deleteNews(latestNews[0].id)}
            emptyHint="点击右侧「更新」按钮拉取最新市场资讯。"
            action={
              <ActionButton onClick={updateLatestNews} loading={loading.latest}>
                更新最新市场消息
              </ActionButton>
            }
          />
        </div>
      ) : (
        <ReviewSection
          review={review}
          onChange={updateReviewField}
          action={
            <ActionButton onClick={updateReview} loading={loading.review} primary>
              AI 生成复盘
            </ActionButton>
          }
        />
      )}
    </div>
  );
}

function ConfigNotice({ demoMode }: { demoMode: boolean | null }) {
  if (demoMode === null) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/20 p-4 text-sm text-amber-800 dark:text-amber-200">
        <p className="font-medium">⚠️ 消息与复盘功能需要后端配置</p>
        <p className="mt-1">
          当前为演示模式。正式上线前，请在 Cloudflare Pages 环境变量中配置 RSS_URLS、AI_API_URL、AI_API_KEY。
          <a href="#config" className="underline">查看配置说明</a>。
        </p>
      </section>
    );
  }

  if (demoMode) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/20 p-4 text-sm text-amber-800 dark:text-amber-200">
        <p className="font-medium">⚠️ 当前为演示模式</p>
        <p className="mt-1">
          你看到的是程序内置的示例新闻和复盘。正式上线后，请在 Cloudflare Pages 环境变量中配置真实 RSS 源和 AI API，即可拉取真实市场消息并生成 AI 复盘。
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-900/20 p-4 text-sm text-green-800 dark:text-green-200">
      <p className="font-medium">✅ 已连接真实消息源</p>
      <p className="mt-1">当前从配置的 RSS 源拉取市场消息。</p>
    </section>
  );
}

function NewsSection({
  title,
  icon,
  news,
  holdingNames,
  onDelete,
  emptyHint,
  action,
}: {
  title: string;
  icon: string;
  news: NewsItem | null;
  holdingNames: string[];
  onDelete: () => void;
  emptyHint?: string;
  action?: React.ReactNode;
}) {
  const parsed = news ? parseContent(news.content) : { items: [] };
  const items = parsed.items;
  const fetchedAt = parsed.fetchedAt;

  return (
    <section className="rounded-xl bg-white dark:bg-zinc-900 p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          <span className="mr-2">{icon}</span>
          {title}
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          {news && (
            <>
              <span className="text-xs text-zinc-500">
                拉取：{fetchedAt ? new Date(fetchedAt).toLocaleString("zh-CN") : new Date(news.createdAt).toLocaleString("zh-CN")}
              </span>
              <button onClick={onDelete} className="text-xs text-red-600 hover:text-red-700">
                删除
              </button>
            </>
          )}
          {action}
        </div>
      </div>

      {!news ? (
        <p className="mt-4 text-sm text-zinc-500">{emptyHint}</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">未拉取到相关消息。{demoModeHint(parsed.demo)}</p>
      ) : (
        <div className="mt-4 grid gap-3">
          {items.map((item, idx) => (
            <NewsCard key={idx} item={item} holdingNames={holdingNames} />
          ))}
        </div>
      )}
    </section>
  );
}

function demoModeHint(demo?: boolean) {
  if (demo === undefined) return "";
  return demo ? "当前为演示模式，未配置真实 RSS 源。" : "";
}

function NewsCard({
  item,
  holdingNames,
}: {
  item: { title: string; description: string; link: string; pubDate: string; source: string };
  holdingNames: string[];
}) {
  const date = item.pubDate ? formatDate(item.pubDate) : "";
  const highlightedDesc = highlightKeywords(item.description, holdingNames);
  const hasLink = item.link && item.link !== "#" && item.link.startsWith("http");

  return (
    <article className="group rounded-lg bg-zinc-50 dark:bg-zinc-800/50 p-4 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800">
      <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
        {item.title}
      </h4>
      <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        {highlightedDesc.map((part, i) =>
          part.highlight ? (
            <mark key={i} className="rounded bg-amber-100 px-1 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
              {part.text}
            </mark>
          ) : (
            <span key={i}>{part.text}</span>
          )
        )}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
        {item.source && <span>来源：{item.source}</span>}
        {date && <span>时间：{date}</span>}
        {hasLink && (
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            查看原文 →
          </a>
        )}
      </div>
    </article>
  );
}

function ReviewSection({
  review,
  onChange,
  action,
}: {
  review: DailyReview | null;
  onChange: (field: keyof DailyReview, value: string) => void;
  action?: React.ReactNode;
}) {
  const fields: { key: keyof DailyReview; label: string; icon: string; placeholder: string }[] = [
    {
      key: "marketSummary",
      label: "市场整体",
      icon: "📊",
      placeholder: "今日大盘和主要指数表现、成交情绪...",
    },
    {
      key: "sectorRotation",
      label: "板块轮动",
      icon: "🔄",
      placeholder: "领涨/领跌板块、资金动向...",
    },
    {
      key: "positionReview",
      label: "持仓回顾",
      icon: "💼",
      placeholder: "持仓个股表现、关键操作、是否符合预期...",
    },
    {
      key: "tomorrowPlan",
      label: "明日计划",
      icon: "🎯",
      placeholder: "目标价位、止损位、调仓计划、关注消息...",
    },
  ];

  if (!review) {
    return (
      <section className="rounded-xl bg-white dark:bg-zinc-900 p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">当日复盘</h3>
          <div className="flex items-center gap-3">{action}</div>
        </div>
        <p className="mt-6 text-center text-zinc-500">点击「AI 生成复盘」按钮生成当日复盘，或手动填写。</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl bg-white dark:bg-zinc-900 p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{review.date} 当日复盘</h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500">更新时间：{new Date(review.createdAt).toLocaleString("zh-CN")}</span>
          {action}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {fields.map((field) => (
          <label key={field.key} className="block lg:col-span-2">
            <span className="mb-1.5 flex items-center text-sm font-medium text-zinc-700 dark:text-zinc-300">
              <span className="mr-2">{field.icon}</span>
              {field.label}
            </span>
            <textarea
              className="min-h-[140px] w-full rounded-lg border-0 bg-zinc-50 dark:bg-zinc-800/60 px-4 py-3 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-blue-500"
              placeholder={field.placeholder}
              value={review[field.key]}
              onChange={(e) => onChange(field.key, e.target.value)}
            />
          </label>
        ))}
      </div>
    </section>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm"
          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

function ActionButton({
  onClick,
  loading,
  primary,
  children,
}: {
  onClick: () => void;
  loading?: boolean;
  primary?: boolean;
  children: React.ReactNode;
}) {
  const base = "rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-60";
  const style = primary
    ? "bg-blue-600 text-white hover:bg-blue-700"
    : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700";
  return (
    <button onClick={onClick} disabled={loading} className={`${base} ${style}`}>
      {loading ? "加载中..." : children}
    </button>
  );
}

function parseContent(content: string) {
  try {
    return JSON.parse(content) as {
      items: FetchedNewsItem[];
      fetchedAt?: string;
      demo?: boolean;
    };
  } catch {
    return { items: [] as FetchedNewsItem[] };
  }
}

function formatDate(input: string) {
  try {
    const d = new Date(input);
    if (isNaN(d.getTime())) return input;
    return d.toLocaleString("zh-CN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return input;
  }
}

function highlightKeywords(text: string, keywords: string[]) {
  if (keywords.length === 0) return [{ text, highlight: false }];
  const safeKeywords = keywords.filter(Boolean).sort((a, b) => b.length - a.length);
  const regex = new RegExp(`(${safeKeywords.map(escapeRegExp).join("|")})`, "g");
  const parts = text.split(regex);
  return parts.map((part) => ({
    text: part,
    highlight: safeKeywords.includes(part),
  }));
}

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
