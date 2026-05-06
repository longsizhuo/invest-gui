# src/lib/

前端工具/客户端。无 React 依赖（除非组件强依赖），可独立测试。

## 内容

- `api-client.ts` — 同源 fetch 包装：`fetcher`（GET，给 SWR 用）/ `postJSON` / `putJSON` / `deleteJSON`。统一错误处理（`ApiError` 类暴露 `status` + `detail`）。导出所有后端响应类型（从 `api-types.ts` re-export）。
- `api-types.ts` — **自动生成**。`pnpm gen-types` 从本机 `127.0.0.1:8765/openapi.json` 拉 OpenAPI schema 重生 TS 类型；**不要手改**。
- `format.ts` — 数字/时间格式化（`formatCNY` / `formatAUD` / `formatGrams` / `formatPct` / `shortTime`）

## 同步流程

后端改 endpoint → 跑 `pnpm gen-types` → TS 编译报错 = 该改的字段；改完前端就同步。CI 不强制（避免后端没起阻塞）。

## 设计约束

- `api-client.ts` 用相对路径 `/api/*`，**不带 host**（同源部署假设）
- CF Access cookie 由浏览器自动带（`credentials: "same-origin"`）
- 所有写函数调用方应该在 `try/catch` 里捕获 `ApiError` 展示给用户
