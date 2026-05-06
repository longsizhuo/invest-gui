# src/routes/

React Router v6 页面级组件。每个 `.tsx` 对应一条路由（在 `main.tsx` 注册）。

## 路由表

| Path | 组件 | 数据源 |
|------|------|--------|
| `/` | `Dashboard.tsx` | `GET /api/portfolio` (30s 自动刷新) + 操作 dialog 触发器 + PnL 图 + TradingView |
| `/history` | `History.tsx` | `GET /api/history?limit=200` + symbol 过滤下拉 |
| `/strategy` | `Strategy.tsx` | `GET /api/strategy` + 编辑 dialog（资产 CRUD + allocation 调整）|
| `/committee` | `Committee.tsx` | `POST /api/committee/run` + SWR 5s 轮询 `/api/committee/{task_id}` |

## 设计约束

- 全部用 SWR 拉数据；写操作完成后调 `mutate(...)` 让相关页面重拉
- Loading/Error 状态都要明确展示（`isLoading` / `error.message`）
- 不直接 fetch，统一走 `lib/api-client.ts` 包装

## 与其他目录的关系

- 上游：`main.tsx` 注册路由
- 下游：调 `lib/api-client.ts`、组合 `components/` 子组件
