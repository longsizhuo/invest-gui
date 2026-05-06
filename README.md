# invest-gui

> [longsizhuo/openInvest](https://github.com/longsizhuo/openInvest) 的 Web GUI 前端
> Vite + React + TypeScript + Tailwind · 部署到本机 `/srv/invest-gui/`，Caddy file_server 直 serve

## 设计

- **前后端分仓**：invest（Python）暴露 FastAPI REST，invest-gui（这里）只是消费者
- **同源部署**：生产 Caddy 把 `invest.longsizhuo.com` 的 `/api/*` 反代到 `127.0.0.1:8765`，`/*` 落到静态文件，**无 CORS**
- **认证**：Cloudflare Access 在域名层把关（仅 `longsizhuo@gmail.com`），前端代码无 auth 逻辑
- **类型同步**：`pnpm gen-types` 从本机 8765 拉 OpenAPI schema 自动生成 TS 类型，杜绝前后端飘字段
- **不上 SSR**：纯静态 + 客户端 SWR 拉数据，避免 Node daemon 拖垮服务器（参考 mc-website 教训）

## 本地开发

需要 invest 后端在本机 8765 端口运行：

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

## 路由

| 路径 | 页面 | 数据来源 |
|------|------|---------|
| `/` | 主面板（现金 + 黄金 + NDQ） | `GET /api/portfolio` (30s 自动刷新) |
| `/history` | 交易流水表（按 symbol 过滤） | `GET /api/history?limit=200` |
| `/strategy` | 投资策略 + 各资产 cap | `GET /api/strategy` |

## 部署

```bash
pnpm deploy   # = scripts/deploy.sh，本机构建 + rsync 到 /srv/invest-gui/
```

服务器 Caddy 站点块（`caddy-gateway/Caddyfile`）：

```caddyfile
http://invest.longsizhuo.com {
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

详见 `~/.claude/plans/temporal-toasting-fairy.md`。

## 类型同步流程

1. 后端改了 endpoint / Pydantic model → OpenAPI schema 跟着变
2. `pnpm gen-types` 重新生成 `src/lib/api-types.ts`
3. TS 编译报错 = 前端代码该改的字段；改完 commit 类型产物
4. CI 不强制跑（避免后端没起时阻塞构建）

## 技术选型记录

- **Vite + React 而不是 Next.js**：和 longsizhuo.com 一致；纯静态 + Caddy file_server，**无任何 daemon 进程**。Next.js `next start` 在 mc-website 触发过整机三次挂死。
- **Tailwind 而不是 shadcn/ui**：单人内部工具，3 个只读页面手写组件足够；后续若加复杂表单（PR 4）再评估
- **SWR 而不是 React Query**：依赖更轻；只读为主的场景下两者差异不大
- **React Router v6 BrowserRouter**：配合 Caddy `try_files {path} /index.html` 兜底 SPA 路由
