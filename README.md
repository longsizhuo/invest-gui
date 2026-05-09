# invest-gui

> [longsizhuo/openInvest](https://github.com/longsizhuo/openInvest) 的 Web GUI 前端
> Vite + React + TypeScript + Tailwind · 部署到本机 `/srv/invest-gui/`，Caddy file_server 直 serve

## 设计

- **前后端分仓**：openInvest（Python）暴露 FastAPI REST，invest-gui（这里）只是消费者
- **同源部署**：生产 Caddy 把 `invest.your-domain.com` 的 `/api/*` 反代到 `127.0.0.1:8765`，`/*` 落到静态文件，**无 CORS**
- **认证**：Cloudflare Access 在域名层把关（仅授权邮箱），前端代码无 auth 逻辑
- **类型同步**：`pnpm gen-types` 从本机 8765 拉 OpenAPI schema 自动生成 TS 类型，杜绝前后端飘字段
- **不上 SSR**：纯静态 + 客户端 SWR 拉数据，避免 Node daemon 拖垮服务器

## 设计系统（2026-05+ 重做）

走"金融 + 编辑感"的中间路线，不照搬纯 monochrome（金融场景需保留涨跌红绿语义）：

- **Token 分层**（`src/index.css :root`）：
  - `--surface-{base,raised,overlay,inverse}` 4 级容器
  - `--text-{primary,secondary,tertiary,inverse}` 3+1 级文本
  - `--{pos,neg,warn,stale}` 数据语义层（仅给数字 / chip 用，禁装饰）
  - `--accent` 单色装饰类（hover / focus / 主 CTA）
- **排版三层**：
  - `font-display` Playfair Display serif —— hero / page title 大字
  - `font-ui` Inter sans —— 正文、标签、UI
  - `font-mono` JetBrains Mono —— 所有数字 + 时间戳 + symbol
- **0 圆角原则**：除 input / 按钮 2px 触感圆角和 PipelineFlow 圆形 avatar 外全部直角

未来想切主题（如做 light mode）只需改 `:root` 一处，组件不动。

## 路由 / IA

| 路径 | 页面 | 数据来源 |
|------|------|---------|
| `/` | 主面板（Hero 总资产 + 持仓 + PnL + K 线） | `GET /api/holdings` (30s 自动刷新) + `/api/portfolio/total_value` |
| `/history` | 交易流水表（按 symbol 过滤） | `GET /api/history?limit=200` |
| `/strategy` | 投资策略 + 各资产 cap | `GET /api/strategy` |
| `/committee` | **AI 决策中心**（7 tab）—— 见下表 | 多端点 |
| `/system` | 内部状态（6 tab）—— 见下表 | 多端点 |
| `/transparency` | → redirect 到 `/committee`（兼容旧书签） | — |

### `/committee` —— 一切关于"AI 怎么决策"

| Tab | 内容 |
|-----|------|
| 触发 / 直播 | 手动启动新一次委员会 + SSE 实时推送 stage 进度 |
| 决议归档 | 所有历史决议 markdown（按日期 + 资产）|
| 决策回放 | 6 步辩论流程图动画 |
| 4 角色 + 规则 | macro/quant/risk/cio system prompt 全文 + REGIME 阈值表 |
| 历史命中率 | 1d / 7d / 30d × verdict 类型聚合统计 |
| LLM 用量 | token / 延迟 / 成本时序 |
| Tool 调用 | agent 调了哪些 tool，入参 / 出参 / 耗时 |

### `/system` —— 内部状态 + 数据源

| Tab | 内容 |
|-----|------|
| Cron Jobs | 静默任务时刻表（下次几点跑）|
| 市场 Regime | 牛/熊/震荡判定（喂给 quant LLM 的硬约束）|
| 数据源 | yfinance / DB / commsec 健康度 |
| PnL 历史 | 原始 2h 快照点 |
| 长期模式 | Dreaming 沉淀的 insights |
| Dreams | 短期记忆 + 候选池 |

## 环境变量配置

将 `.env.example` 复制为 `.env` 后按需修改：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `VITE_INSTANCE_NAME` | `openInvest` | Navbar wordmark 和 footer 实例名；fork 部署时改成自己的名称，如 "我的投委会" |
| `VITE_GITHUB_REPO` | `https://github.com/longsizhuo/openInvest` | Footer GitHub 链接；fork 后改成自己的仓库 URL |
| `VITE_API_BASE` | （空，同源） | 后端 API 地址；生产 Caddy 同源反代时留空；本地跨域开发时填 `http://127.0.0.1:8765` |

## 本地开发

需要 openInvest 后端在本机 8765 端口运行：

```bash
# 1) 启动后端（在 invest 仓库根目录）
cd ../invest
INVEST_WEB_DEV_CORS=1 uv run uvicorn connectors.web_api:app --host 127.0.0.1 --port 8765

# 2) 同步 API 类型（可选，OpenAPI schema 变了再跑）
cd ../invest-gui
pnpm install
pnpm gen-types

# 3) 起前端 dev server（端口 5173，proxy /api → 8765）
pnpm dev
```

打开 http://localhost:5173

## 部署

```bash
pnpm deploy   # = scripts/deploy.sh，本机构建 + rsync 到 /srv/invest-gui/
```

服务器 Caddy 站点块（`caddy-gateway/Caddyfile`）：

```caddyfile
http://invest.your-domain.com {
    encode gzip
    handle /api/* {
        reverse_proxy 127.0.0.1:8765
    }
    handle {
        root * /srv/invest-gui
        file_server
        try_files {path} /index.html
    }
}
```

## 类型同步流程

1. 后端改了 endpoint / Pydantic model → OpenAPI schema 跟着变
2. `pnpm gen-types` 重新生成 `src/lib/api-types.ts`
3. TS 编译报错 = 前端代码该改的字段；改完 commit 类型产物
4. CI 不强制跑（避免后端没起时阻塞构建）

## 技术选型记录

- **Vite + React 而不是 Next.js**：和 longsizhuo.com 一致；纯静态 + Caddy file_server，**无任何 daemon 进程**
- **Tailwind 而不是 shadcn/ui**：单人内部工具，自定义组件库（`Button` / `Card` / `Dialog` / `Field` / `StatusBadge`）通过 CSS variable token 控制 theme，足够灵活
- **SWR 而不是 React Query**：依赖更轻；只读为主的场景下两者差异不大
- **React Router v6 BrowserRouter**：配合 Caddy `try_files {path} /index.html` 兜底 SPA 路由
- **motion (formerly framer-motion v12)**：仅用于 Pipeline 动画，主体是静态布局
- **CSS variables 而不是 Tailwind preset 主题**：runtime 切换主题不用重 build；和 design system 解耦更彻底
