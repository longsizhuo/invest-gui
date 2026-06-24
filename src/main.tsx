import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import App from "./App";
import { PrivacyProvider } from "./lib/privacy";
import { ToastProvider } from "./components/Toast";
import "./index.css";

// ─── 路由代码分割（code splitting）─────────────────────────────────────────────
// 用 React.lazy 按需加载各路由，减小首屏 bundle 体积。
// Suspense fallback 统一用 Loading 占位组件。

const Dashboard = React.lazy(() => import("./routes/Dashboard"));
const History = React.lazy(() => import("./routes/History"));
const Strategy = React.lazy(() => import("./routes/Strategy"));
const Committee = React.lazy(() => import("./routes/committee"));
const System = React.lazy(() => import("./routes/System"));
const BulkImport = React.lazy(() => import("./routes/Holdings/BulkImport"));
const PublicStats = React.lazy(() => import("./routes/PublicStats"));
const Settings = React.lazy(() => import("./routes/Settings"));

/** 路由加载中占位：居中圆圈 spinner + 文字 */
function Loading() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-[var(--text-tertiary)]">
      {/* 纯 CSS spinner：不引入 icon 库 */}
      <div
        className="w-8 h-8 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin"
        aria-hidden="true"
      />
      <span className="text-sm">加载中...</span>
    </div>
  );
}

/**
 * 公开页布局 —— 极简外壳：base 背景 + 居中 main + 最小 footer。
 *
 * 关键：**不含** App 的 NudgesInit / 私有导航。公开访客（/public/stats，
 * Caddy 放行、不走 CF Access）因此不会触发 /api/insights/fresh、
 * /api/reengagement 等私有端点，也看不到可点进的私有页导航（issue #5）。
 */
function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface-base)]">
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10">
        <Outlet />
      </main>
      <footer className="border-t border-[var(--border-subtle)] px-6 py-4 text-xs text-[var(--text-tertiary)] text-center">
        {import.meta.env.VITE_INSTANCE_NAME ?? "openInvest"} · 公开命中率 · MIT
      </footer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* ToastProvider 最外层：useNudges 和任何子组件都能调 useToast */}
    <ToastProvider>
      <PrivacyProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Suspense fallback={<Loading />}>
            <Routes>
              {/* 公开命中率页：独立精简布局（PublicLayout），不挂 App 外壳。
                  避免公开访客触发 NudgesInit 的私有端点（/api/insights/fresh、
                  /api/reengagement）或看到可点进的私有导航；本页只调
                  /api/stats/public（不走 CF Access，后续 Caddy 放行）。 —— issue #5 */}
              <Route path="/public/stats" element={<PublicLayout />}>
                <Route index element={<PublicStats />} />
              </Route>
              <Route path="/" element={<App />}>
                <Route index element={<Dashboard />} />
                <Route path="history" element={<History />} />
                <Route path="strategy" element={<Strategy />} />
                <Route path="committee" element={<Committee />} />
                <Route path="system" element={<System />} />
                {/* 批量录入：/holdings/import */}
                <Route path="holdings/import" element={<BulkImport />} />
                {/* 设置：唯一 GUI-only 数据入口（wealth_context 等 agent 拿不到的字段）*/}
                <Route path="settings" element={<Settings />} />
                {/* /transparency 已并入 /committee（书签兼容） */}
                <Route path="transparency" element={<Navigate to="/committee" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </PrivacyProvider>
    </ToastProvider>
  </React.StrictMode>,
);
