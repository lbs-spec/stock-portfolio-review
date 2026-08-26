# 持仓管理与复盘

一个用于 A 股、港股持仓管理、成交分析与每日复盘的 Next.js 网站。持仓和成交数据保存在浏览器本地（localStorage），消息复盘通过 Cloudflare Pages Functions 后端拉取互联网消息源并由 AI 整理。

## 功能

- **持仓管理**
  - 手动录入持仓（代码、名称、数量、成本价、最新价、市场等）
  - 导入东方财富持仓模板 `.xlsx`，带确认预览
  - 自动计算盈亏、盈亏比、市值合计
- **成交分析**
  - 导入东财成交模板 `.xlsx`，带确认预览
  - 按证券汇总买卖均价、已实现盈亏
  - 给出交易合理性建议
- **消息与复盘**
  - 从互联网财经 RSS 源自动拉取盘前/最新市场消息
  - 根据持仓名称自动筛选持仓相关消息
  - 调用 AI API 自动生成当日复盘（市场整体、板块轮动、持仓回顾、明日计划）

## 本地开发

### 仅前端开发

```bash
npm install
npm run dev
```

打开 http://localhost:3000 即可使用。此时「消息与复盘」功能需要后端支持。

### 本地完整体验（含 Cloudflare Pages Functions 后端）

由于 Windows 上 `@cloudflare/next-on-pages` 的实时开发模式存在兼容性问题，推荐使用静态导出方式在本地体验完整功能：

```bash
npm run dev:static
```

这会：
1. 以静态导出模式构建 Next.js 站点到 `dist/` 目录
2. 启动 wrangler 本地服务器，同时加载 `functions/` 目录下的 `/api/news` 和 `/api/review`

然后打开 http://localhost:8791 即可使用。

本地默认启用「演示模式」：`.dev.vars` 中已配置 `DEMO_NEWS=1` 和 `DEMO_REVIEW=1`，会返回示例新闻和复盘。如需体验真实 RSS 和 AI，修改 `.dev.vars` 中的配置后重启服务。

### 停止本地服务

`dev:static` 启动后，按 `Ctrl+C` 即可停止。

## 部署到 Cloudflare Pages

本项目已配置 `@cloudflare/next-on-pages`。

### 1. 通过 GitHub + Cloudflare Dashboard 部署

1. 将整个项目推送到 GitHub 仓库。
2. 登录 Cloudflare Dashboard，进入 **Pages**。
3. 选择 **Create a project** → **Connect to Git**。
4. 选择本仓库，分支选 `main`（或你实际使用的分支）。
5. 构建设置：
   - **Build command**: `npm run pages:build`
   - **Build output directory**: `.vercel/output/static`
6. 配置环境变量（见下方）。
7. 保存并部署。

### 2. 通过 Wrangler CLI 部署

```bash
npm run pages:build
npm run pages:deploy
```

> 注意：`npm run pages:build` 在 Windows 本地可能因 Vercel CLI 的兼容性问题失败，这是已知问题。实际 Cloudflare Pages 的构建环境为 Linux，不会影响线上部署。

## 环境变量配置

### 在哪里配置

正式上线时，**API 地址和 API Key 不是在网站页面上填写的**，需要在 Cloudflare Pages 控制台中配置环境变量：

1. 进入 Cloudflare Dashboard → **Pages** → 选择你的项目。
2. 点击 **Settings** → **Variables and Secrets** → **Add**。
3. 依次添加下表中的变量。
4. 保存后需要重新部署一次，环境变量才会生效。

### 必填/选填变量

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `AI_API_URL` | 是 | AI API 端点，例如 `https://api.openai.com/v1/chat/completions` 或 Kimi/Claude 兼容端点 |
| `AI_API_KEY` | 是 | 对应 AI 服务的 API Key |
| `AI_MODEL` | 否 | 模型名称，例如 `gpt-4o`、`kimi-latest`、`claude-sonnet-4`。不填时后端默认使用 `default` |
| `RSS_URLS` | 否 | 自定义 RSS 源，多个用逗号分隔。不填则使用默认新浪财经源 |

### 配置示例

以 OpenAI 官方接口为例：

```
AI_API_URL=https://api.openai.com/v1/chat completions
AI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AI_MODEL=gpt-4o
```

以 Kimi（Moonshot）为例：

```
AI_API_URL=https://api.moonshot.cn/v1/chat/completions
AI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AI_MODEL=kimi-latest
```

### 为什么不在网页上修改 API Key

- API Key 属于敏感信息，如果写在前端页面中，会被任何人通过浏览器开发者工具直接看到。
- Cloudflare Pages Functions 在服务端运行，环境变量不会泄露给浏览器。
- 因此配置只能在 Cloudflare 后台完成，网站前端只显示「是否连接真实消息源/AI」的状态。

### AI 接口兼容格式

`/api/review` 会按 OpenAI 兼容格式发送请求：

```json
{
  "model": "你的模型名",
  "messages": [
    { "role": "system", "content": "你是专业股票投资助手，只输出 JSON。" },
    { "role": "user", "content": "...prompt..." }
  ],
  "max_tokens": 1500
}
```

AI 需要返回包含以下字段的 JSON：

```json
{
  "marketSummary": "...",
  "sectorRotation": "...",
  "positionReview": "...",
  "tomorrowPlan": "..."
}
```

OpenAI、Kimi、Claude API 等兼容此格式的服务均可使用。

## 数据说明

- **持仓、成交、消息、复盘内容**保存在浏览器 `localStorage` 中，不会上传到服务器。
- **新闻拉取和 AI 复盘**通过 Cloudflare Pages Functions 后端进行，持仓代码/名称会随请求发送到后端用于关键词筛选和生成 prompt。
- 更换浏览器或清除缓存会导致本地数据丢失，建议定期导出重要内容。

## 技术栈

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- xlsx（Excel 解析）
- Cloudflare Pages Functions
- @cloudflare/next-on-pages

## 自定义 RSS 源

默认使用新浪财经 RSS。如需更换，在 Cloudflare 环境变量中设置：

```
RSS_URLS=https://example.com/feed1.xml,https://example.com/feed2.xml
```

RSS 需为标准的 `item/title/link/description/pubDate` 格式。
