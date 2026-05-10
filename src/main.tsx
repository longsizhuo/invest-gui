import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* ToastProvider 最外层：useNudges 和任何子组件都能调 useToast */}
    <ToastProvider>
      <PrivacyProvider>
        <BrowserRouter>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<App />}>
                <Route index element={<Dashboard />} />
                <Route path="history" element={<History />} />
                <Route path="strategy" element={<Strategy />} />
                <Route path="committee" element={<Committee />} />
                <Route path="system" element={<System />} />
                {/* 批量录入：/holdings/import */}
                <Route path="holdings/import" element={<BulkImport />} />
                {/* 公开命中率页：/public/stats（不走 CF Access，后续 Caddy 放行） */}
                <Route path="public/stats" element={<PublicStats />} />
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
