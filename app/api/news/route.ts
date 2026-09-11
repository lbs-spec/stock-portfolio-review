import { getRuntimeEnv } from "../../lib/runtime-env";

export const runtime = "edge";

interface NewsItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
}

const UA = "Mozilla/5.0 (compatible; StockPortfolioBot/1.0)";

// 演示数据：仅在明确开启 DEMO_NEWS 时使用
const demoNews: NewsItem[] = [
  {
    title: "沪指收涨0.34%报2867点，锂电、有色板块领涨",
    link: "",
    description: "A股三大指数分化，沪指收涨0.34%，深成指涨0.43%，创业板指涨0.93%。锂电、固态电池概念走强，有色金属板块活跃，两市成交约6072亿元。",
    pubDate: "",
    source: "演示数据",
  },
  {
    title: "港股恒指收涨1.1%，科技、资源股回暖",
    link: "",
    description: "恒生指数收涨1.14%，恒生科技指数涨1.82%。资源股表现强势，科技股集体反弹，南向资金净买入约42亿港元。",
    pubDate: "",
    source: "演示数据",
  },
  {
    title: "碳酸锂期货主力合约涨超3%，锂盐厂挺价意愿增强",
    link: "",
    description: "受澳洲矿山减产、南美盐湖投产进度不及预期影响，碳酸锂期货主力合约涨3.4%。锂盐厂库存压力缓解，挺价意愿增强。",
    pubDate: "",
    source: "演示数据",
  },
  {
    title: "铜价逼近9200美元/吨，铜矿供应紧张预期升温",
    link: "",
    description: "LME铜期货创近两周新高。刚果（金）部分铜矿运输受阻、智利铜矿品位下降，加剧市场对下半年铜精矿供应紧张的担忧。",
    pubDate: "",
    source: "演示数据",
  },
];

interface EastMoneyItem {
  title?: string;
  summary?: string;
  showTime?: string;
  stockList?: string[];
}

/** 东方财富 7x24 快讯：免费、无鉴权、返回 JSON，附带关联个股/板块代码 */
async function fetchEastMoneyFastNews(pageSize: number): Promise<NewsItem[]> {
  const url =
    `https://np-listapi.eastmoney.com/comm/web/getFastNewsList` +
    `?client=web&biz=web_724&fastColumn=102&sortEnd=&pageSize=${pageSize}&req_trace=${Date.now()}`;

  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return [];

  const json = (await res.json()) as { data?: { fastNewsList?: EastMoneyItem[] } };
  const list = json.data?.fastNewsList ?? [];

  return list
    .filter((n) => n.title)
    .map((n) => ({
      title: (n.title || "").trim(),
      description: (n.summary || "").replace(/\s+/g, " ").trim(),
      link: "",
      pubDate: n.showTime || "",
      source: "东方财富",
    }));
}

function parseRSS(xml: string, source: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractTag(block, "title").replace(/\s+/g, " ").trim();
    const link = extractTag(block, "link").trim();
    const description = extractTag(block, "description").replace(/\s+/g, " ").trim();
    const pubDate = extractTag(block, "pubDate").trim();
    if (title) items.push({ title, link, description, pubDate, source });
  }
  return items;
}

function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}(?:\\s+[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = regex.exec(xml);
  return match ? decodeHTMLEntities(match[1]) : "";
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

async function fetchRSSFeeds(urls: string[]): Promise<NewsItem[]> {
  const results = await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetch(url, { headers: { "User-Agent": UA } });
        if (!res.ok) return [] as NewsItem[];
        const xml = await res.text();
        return parseRSS(xml, new URL(url).hostname);
      } catch {
        return [] as NewsItem[];
      }
    })
  );
  return results.flat();
}

function dedupeByTitle(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  return items.filter((i) => {
    const key = i.title.trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sortByTimeDesc(items: NewsItem[]): NewsItem[] {
  return items.sort((a, b) => {
    const ta = new Date(a.pubDate || 0).getTime();
    const tb = new Date(b.pubDate || 0).getTime();
    return tb - ta;
  });
}

function filterByKeywords(items: NewsItem[], keywords: string[]): NewsItem[] {
  if (keywords.length === 0) return items.slice(0, 30);
  const lower = keywords.map((k) => k.toLowerCase());
  return items
    .filter((item) => {
      const text = `${item.title} ${item.description}`.toLowerCase();
      return lower.some((k) => text.includes(k));
    })
    .slice(0, 20);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "market"; // market | holding
  const keywords = (url.searchParams.get("keywords") || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const env = getRuntimeEnv();
  const demoMode = env.DEMO_NEWS === "1" || env.DEMO_NEWS === 1 || env.DEMO_NEWS === true;

  if (demoMode) {
    const items = type === "holding" ? filterByKeywords(demoNews, keywords) : demoNews;
    return Response.json({
      items,
      fetchedAt: new Date().toISOString(),
      demo: true,
    });
  }

  // 主源：东方财富 7x24 快讯；辅源：自定义 RSS（默认新浪财经）
  const defaultFeeds = ["https://rss.sina.com.cn/roll/finance/hot_roll.xml"];
  const envFeeds = (env.RSS_URLS as string | undefined)
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const rssUrls = envFeeds?.length ? envFeeds : defaultFeeds;

  try {
    const [east, rss] = await Promise.all([
      fetchEastMoneyFastNews(100),
      fetchRSSFeeds(rssUrls),
    ]);

    let all = dedupeByTitle([...east, ...rss]);
    if (all.length === 0) all = demoNews;
    all = sortByTimeDesc(all);

    const items = type === "holding" ? filterByKeywords(all, keywords) : all.slice(0, 30);

    return Response.json(
      {
        items,
        fetchedAt: new Date().toISOString(),
        demo: false,
        sources: { eastMoney: east.length, rss: rss.length },
      },
      { headers: { "Cache-Control": "public, max-age=300" } }
    );
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "拉取新闻失败" },
      { status: 500 }
    );
  }
}
