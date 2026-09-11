import { getRuntimeEnv } from "../../lib/runtime-env";

export const runtime = "edge";

interface ReviewRequest {
  positions: { code: string; name: string; quantity: number; costPrice: number; currentPrice: number }[];
  news: { title: string; description: string; source: string }[];
  date: string;
}

function buildPrompt(data: ReviewRequest): string {
  const holdings = data.positions
    .map(
      (p) =>
        `- ${p.name}(${p.code}): 持仓${p.quantity}股, 成本价${p.costPrice}, 最新价${p.currentPrice}, 盈亏比${
          p.costPrice > 0 ? (((p.currentPrice - p.costPrice) / p.costPrice) * 100).toFixed(2) + "%" : "N/A"
        }`
    )
    .join("\n");

  const newsText = data.news
    .slice(0, 15)
    .map((n) => `- [${n.source}] ${n.title}: ${n.description}`)
    .join("\n");

  return `你是专业的A股/港股投资顾问。请基于下面的持仓数据和最新财经新闻，为每只持仓个股给出具体、可执行的交易建议。

日期：${data.date}

## 当前持仓
${holdings || "暂无持仓"}

## 最新财经新闻
${newsText || "暂无新闻"}

请用中文输出 JSON，包含以下四个字段：
1. marketSummary：今日大盘和主要指数表现、成交情绪（2-3句）
2. sectorRotation：领涨/领跌板块、资金动向（2-3句）
3. positionReview：逐只分析持仓个股表现及原因，结合相关新闻（每只1-2句）
4. tomorrowPlan：对每只持仓给出明确操作建议，必须包含：操作方向（加仓/减仓/持有观望/止损）、理由、参考价位或止损位；最后补充整体仓位与风控建议

输出格式严格为 JSON（不要输出多余文字或代码块标记）：
{
  "marketSummary": "...",
  "sectorRotation": "...",
  "positionReview": "...",
  "tomorrowPlan": "..."
}`;
}

async function callAI(prompt: string, env: Record<string, unknown>): Promise<Record<string, string>> {
  const apiUrl = env.AI_API_URL as string | undefined;
  const apiKey = env.AI_API_KEY as string | undefined;
  const model = (env.AI_MODEL as string | undefined) || "default";

  if (!apiUrl || !apiKey) {
    throw new Error("AI 服务未配置，请在 Cloudflare Pages 环境变量中设置 AI_API_URL 和 AI_API_KEY");
  }

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "你是专业股票投资助手，只输出 JSON。" },
        { role: "user", content: prompt },
      ],
      max_tokens: 2000,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI 服务错误 ${res.status}: ${text}`);
  }

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content || "";

  const match = content.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(match ? match[0] : content) as Record<string, string>;

  return {
    marketSummary: parsed.marketSummary || "",
    sectorRotation: parsed.sectorRotation || "",
    positionReview: parsed.positionReview || "",
    tomorrowPlan: parsed.tomorrowPlan || "",
  };
}

function buildDemoReview(data: ReviewRequest): Record<string, string> {
  const holdings = data.positions.map((p) => `${p.name}(${p.code})`).join(", ") || "暂无持仓";
  const lithiumHoldings = data.positions.filter((p) => /锂|赣锋|天齐/.test(p.name));
  const copperHoldings = data.positions.filter((p) => /铜|江西铜业|紫金/.test(p.name));
  const cxoHoldings = data.positions.filter((p) => /康龙|药明|泰格/.test(p.name));

  return {
    marketSummary: `【演示复盘】沪指今日收涨0.34%报2867点，深成指涨0.43%，创业板指涨0.93%，两市成交约6072亿元，较昨日放量约300亿元。锂电、有色金属板块领涨，市场情绪较前一日有所改善，但成交量仍处相对低位，反弹持续性有待观察。`,
    sectorRotation: `【演示复盘】今日资金明显流向新能源上游资源与有色金属板块。碳酸锂期货涨超3%，带动赣锋锂业、天齐锂业等锂矿股走强；铜价逼近9200美元/吨，江西铜业、紫金矿业等铜业股活跃。科技、消费板块表现相对平淡。`,
    positionReview: `【演示复盘】当前持仓：${holdings}。${
      lithiumHoldings.length > 0
        ? `锂矿持仓（${lithiumHoldings.map((p) => p.name).join("、")}）受碳酸锂价格反弹及供应端减产消息提振，今日表现较强，可关注后续库存去化节奏。`
        : ""
    }${
      copperHoldings.length > 0
        ? `铜业持仓（${copperHoldings.map((p) => p.name).join("、")}）受益于铜矿供应紧张预期，价格维持高位，业绩预期有所改善。`
        : ""
    }${
      cxoHoldings.length > 0
        ? `CXO持仓（${cxoHoldings.map((p) => p.name).join("、")}）半年报业绩同比正增长，但行业投融资环境仍在恢复，短期或维持震荡。`
        : ""
    }建议结合个股成本价与大盘节奏，控制整体仓位。`,
    tomorrowPlan: `【演示复盘】明日关注：1）大盘能否继续放量反弹，若沪指无法突破2900点关口，建议适当减仓；2）碳酸锂期货价格能否持续反弹，决定锂矿股短线空间；3）持仓个股盘中若触及重要压力位（如前期高点或成本价上方5%-8%），可考虑分批止盈；4）未持仓方向暂观望，不追涨。`,
  };
}

export async function POST(request: Request) {
  try {
    const env = getRuntimeEnv();
    const demoMode = env.DEMO_REVIEW === "1" || env.DEMO_REVIEW === 1 || env.DEMO_REVIEW === true;
    const aiConfigured = Boolean(env.AI_API_URL && env.AI_API_KEY);

    const data = (await request.json()) as ReviewRequest;

    if (demoMode || !aiConfigured) {
      const review = buildDemoReview(data);
      return Response.json({ ...review, demo: true, aiConfigured });
    }

    const prompt = buildPrompt(data);
    const review = await callAI(prompt, env);

    return Response.json(review);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "生成复盘失败" },
      { status: 500 }
    );
  }
}
