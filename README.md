# 持仓管理与复盘

一个用于 A 股、港股持仓管理、成交分析、消息收集与交易建议的 Next.js 网站。持仓和成交数据保存在浏览器本地（localStorage），消息与 AI 建议通过 Next.js App Router API 在 Cloudflare Pages Edge Runtime 中运行。

## 功能

- **持仓管理**
  - 手动录入持仓（代码、名称、数量、成本价、最新价、市场等）
  - 导入东方财富持仓模板 `.xlsx`，带确认预览（可下载模板示例）
  - 自动计算盈亏、盈亏比、市值合计
- **成交分析**
  - 导入东财成交模板 `.xlsx`，带确认预览
  - 按证券汇总买卖均价、已实现盈亏，并给出交易合理性建议
- **消息与交易建议**
  - 自动拉取东方财富 7x24 财经快讯（免费、无需 API Key）
  - 按持仓名称自动筛选持仓相关消息，并在正文中高亮持仓股
  - 调用 AI API 生成逐只个股的交易建议（市场整体 / 板块轮动 / 持仓回顾 / 交易建议）

## 本地开发

```bash
npm install
npm run dev
```

打开 http://localhost:3000 即可使用。本地默认启用「演示模式」（`.dev.vars` 中 `DEMO_NEWS=1`、`DEMO_REVIEW=1`），返回示例新闻和复盘；删除这两行即可拉取真实新闻，AI 复盘需填入真实 `AI_API_URL` / `AI_API_KEY`。

## 部署到 Cloudflare Pages

本项目已配置 `@cloudflare/next-on-pages`，API 路由使用 Edge Runtime。

### 1. 通过 GitHub + Cloudflare Dashboard 部署

1. 将整个项目推送到 GitHub 仓库。
2. 登录 Cloudflare Dashboard，进入 **Pages** → **Create a project** → **Connect to Git**。
3. 选择仓库和分支（`main`）。
4. 构建设置：
   - **Build command**：`npm run pages:build`
   - **Build output directory**：`.vercel/output/static`
5. 配置环境变量（见下方）。
6. 保存并部署。

### 2. 通过 Wrangler CLI 部署

```bash
npm run pages:build
npm run pages:deploy
```

## 环境变量配置

正式上线时，**API 地址和 API Key 不是在网站页面上填写**，需要在 Cloudflare 控制台配置：

1. Cloudflare Dashboard → **Pages** → 你的项目 → **Settings** → **Variables and Secrets** → **Add**。
2. 添加下表变量。
3. 保存后重新部署一次，环境变量才会生效。

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `AI_API_URL` | 是 | AI API 端点（OpenAI 兼容格式） |
| `AI_API_KEY` | 是 | 对应 AI 服务的 API Key |
| `AI_MODEL` | 否 | 模型名称，不填时后端默认使用 `default` |
| `RSS_URLS` | 否 | 自定义 RSS 源，多个用逗号分隔。不填则仅使用内置的东方财富快讯 |

### 以 DeepSeek 为例

```
AI_API_URL=https://api.deepseek.com/chat/completions
AI_API_KEY=sk-你的DeepSeekKey
AI_MODEL=deepseek-chat
```

其他兼容 OpenAI 格式的服务（OpenAI、Kimi、Claude 等）同样适用。

### 为什么不在网页上改 API Key

- API Key 属于敏感信息，写在前端页面会被任何人用浏览器开发者工具看到。
- API 路由在 Cloudflare Edge 服务端运行，环境变量不会泄露给浏览器。
- 网站前端只显示「是否连接真实消息源/AI」的状态。

## 数据说明

- **持仓、成交、消息、复盘**保存在浏览器 `localStorage` 中，不会上传到服务器。
- **新闻拉取和 AI 复盘**通过 Cloudflare Pages API 路由进行，持仓代码/名称会随请求发送到后端用于关键词筛选和生成 prompt。
- 更换浏览器或清除缓存会导致本地数据丢失。

## 技术栈

- Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4
- xlsx（Excel 解析）
- Cloudflare Pages Edge Runtime + @cloudflare/next-on-pages
