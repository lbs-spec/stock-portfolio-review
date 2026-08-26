interface NewsItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
}

const demoNews: NewsItem[] = [
  {
    title: "沪指收涨0.34%报2867点，锂电、有色板块领涨",
    link: "#",
    description: "8月22日A股三大指数分化，沪指收涨0.34%报2867.95点，深成指涨0.43%，创业板指涨0.93%。盘面上，锂电池、固态电池概念掀涨停潮，赣锋锂业涨5.2%，天齐锂业涨4.8%；有色金属板块活跃，江西铜业涨3.1%，紫金矿业涨1.9%。两市合计成交6072亿元，较上一交易日放量约300亿元。",
    pubDate: "",
    source: "演示数据",
  },
  {
    title: "碳酸锂期货主力合约涨超3%，锂盐厂挺价意愿增强",
    link: "#",
    description: "受澳洲矿山减产、南美盐湖投产进度不及预期影响，碳酸锂期货主力合约今日涨3.4%报78500元/吨。行业人士表示，部分锂盐厂库存压力缓解，挺价意愿增强，但下游正极材料厂仍以按需采购为主，价格反转尚需观察库存去化节奏。",
    pubDate: "",
    source: "演示数据",
  },
  {
    title: "港股恒指收涨1.1%，科技、资源股回暖",
    link: "#",
    description: "恒生指数今日收涨1.14%报17645点，恒生科技指数涨1.82%。资源股表现强势，赣锋锂业（01772.HK）涨6.3%，天齐锂业（09696.HK）涨5.1%；科技股集体反弹，美团、小米涨超2%。南向资金净买入约42亿港元。",
    pubDate: "",
    source: "演示数据",
  },
  {
    title: "铜价逼近9200美元/吨，铜矿供应紧张预期升温",
    link: "#",
    description: "LME铜期货盘中最高触及9185美元/吨，创近两周新高。刚果（金）部分铜矿运输受阻、智利铜矿品位下降等因素加剧市场对下半年铜精矿供应紧张的担忧。国内铜冶炼企业加工费持续走低，支撑铜价维持高位。",
    pubDate: "",
    source: "演示数据",
  },
  {
    title: "央行开展逆回购操作，单日净投放资金约800亿元",
    link: "#",
    description: "为维护月末流动性平稳，央行今日以利率招标方式开展了7天期逆回购操作，中标利率维持1.7%不变，实现净投放约800亿元。银行间市场资金面整体宽松，隔夜Shibor下行约3个基点。",
    pubDate: "",
    source: "演示数据",
  },
  {
    title: "康龙化成半年报：营收同比增12%，新签订单回暖",
    link: "#",
    description: "康龙化成披露2026年半年报，上半年实现营业收入约63.8亿元，同比增长11.7%；归母净利润约9.2亿元，同比增长6.3%。公司表示小分子CDMO新签订单同比回暖，早期研发业务受行业投融资环境影响仍在恢复中。",
    pubDate: "",
    source: "演示数据",
  },
];

function parseRSS(xml: string, source: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractTag(block, "title").replace(/\s+/g, " ").trim();
    const link = extractTag(block, "link").trim();
    const description = extractTag(block, "description")
      .replace(/\s+/g, " ")
      .trim();
    const pubDate = extractTag(block, "pubDate").trim();
    if (title) {
      items.push({ title, link, description, pubDate, source });
    }
  }
  return items;
}

function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}(?:\s+[^>]*)?>([\s\S]*?)<\/${tag}>`, "i");
  const match = regex.exec(xml);
  return match ? decodeHTMLEntities(match[1]) : "";
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, "$1");
}

function filterByKeywords(items: NewsItem[], keywords: string[]): NewsItem[] {
  if (keywords.length === 0) return items.slice(0, 30);
  const lowerKeywords = keywords.map((k) => k.toLowerCase());
  return items
    .filter((item) => {
      const text = `${item.title} ${item.description}`.toLowerCase();
      return lowerKeywords.some((k) => text.includes(k));
    })
    .slice(0, 20);
}

export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const type = url.searchParams.get("type") || "market"; // market | holding
  const keywordsParam = url.searchParams.get("keywords") || "";
  const keywords = keywordsParam
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const env = context.env as Record<string, unknown>;
  const demoMode = env.DEMO_NEWS === "1" || env.DEMO_NEWS === 1 || env.DEMO_NEWS === true;

  if (demoMode) {
    const items = type === "holding" ? filterByKeywords(demoNews, keywords) : demoNews.slice(0, 30);
    return new Response(JSON.stringify({ items, debug: [{ source: "演示模式", count: items.length }], fetchedAt: new Date().toISOString(), demo: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // 默认财经 RSS 源，可通过环境变量 RSS_URLS 覆盖，逗号分隔
  const defaultFeeds = [
    "https://rss.sina.com.cn/roll/finance/hot_roll.xml",
    "https://rss.sina.com.cn/tech/telecom/internet.xml",
  ];
  const envFeeds = (env.RSS_URLS as string | undefined)?.split(",").map((s) => s.trim()).filter(Boolean);
  const feeds = envFeeds?.length ? envFeeds : defaultFeeds;

  try {
    const feedResults = await Promise.all(
      feeds.map(async (feedUrl) => {
        try {
          const res = await fetch(feedUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; StockPortfolioBot/1.0)",
            },
            cf: { cacheTtl: 300 },
          });
          if (!res.ok) {
            return { url: feedUrl, source: new URL(feedUrl).hostname, count: 0, status: res.status, error: `HTTP ${res.status}` };
          }
          const xml = await res.text();
          const items = parseRSS(xml, new URL(feedUrl).hostname);
          return { url: feedUrl, source: new URL(feedUrl).hostname, count: items.length, status: res.status, items };
        } catch (err) {
          return { url: feedUrl, source: new URL(feedUrl).hostname, count: 0, status: 0, error: err instanceof Error ? err.message : "未知错误" };
        }
      })
    );

    let allItems = feedResults.flatMap((r) => r.items || []).sort((a, b) => {
      return new Date(b.pubDate || 0).getTime() - new Date(a.pubDate || 0).getTime();
    });

    // RSS 源全部为空或失败时， fallback 到演示数据，方便本地预览
    if (allItems.length === 0) {
      allItems = demoNews;
    }

    if (type === "holding") {
      allItems = filterByKeywords(allItems, keywords);
    } else {
      allItems = allItems.slice(0, 30);
    }

    return new Response(JSON.stringify({ items: allItems, debug: feedResults.map((r) => ({ url: r.url, count: r.count, status: r.status, error: r.error })), fetchedAt: new Date().toISOString(), demo: false }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "拉取新闻失败" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
