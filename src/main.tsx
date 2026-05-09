import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App";
import Dashboard from "./routes/Dashboard";
import History from "./routes/History";
import Strategy from "./routes/Strategy";
import Committee from "./routes/committee";
import System from "./routes/System";
import { PrivacyProvider } from "./lib/privacy";
import { ToastProvider } from "./components/Toast";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* ToastProvider 最外层：useNudges 和任何子组件都能调 useToast */}
    <ToastProvider>
      <PrivacyProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />}>
              <Route index element={<Dashboard />} />
              <Route path="history" element={<History />} />
              <Route path="strategy" element={<Strategy />} />
              <Route path="committee" element={<Committee />} />
              <Route path="system" element={<System />} />
              {/* /transparency 已并入 /committee（书签兼容） */}
              <Route path="transparency" element={<Navigate to="/committee" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </PrivacyProvider>
    </ToastProvider>
  </React.StrictMode>,
);
