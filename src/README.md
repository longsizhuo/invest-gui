# src/

React 前端源码根。Vite 入口是 `main.tsx`。

## 子目录职责

| 目录 | 职责 |
|------|------|
| `routes/` | React Router 页面（每个 `.tsx` 一个路由：Dashboard / History / Strategy / Committee） |
| `components/` | 共享 UI 组件（Card / Dialog / Button / Field / 各 Dialog 组件） |
| `lib/` | 工具/客户端（`api-client.ts` `api-types.ts` `format.ts`） |

## 顶层文件

- `main.tsx` — 应用入口（BrowserRouter + React.StrictMode）
- `App.tsx` — 顶层布局（导航栏 + Outlet）
- `index.css` — Tailwind directives + 极少全局样式

## 与其他目录的关系

- 上游：`index.html` 引用 `main.tsx`
- 下游：通过 fetch 同源 `/api/*` 调后端（生产 Caddy 反代 / 开发 Vite proxy）
