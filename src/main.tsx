import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App";
import Dashboard from "./routes/Dashboard";
import History from "./routes/History";
import Strategy from "./routes/Strategy";
import Committee from "./routes/Committee";
import System from "./routes/System";
import Transparency from "./routes/transparency";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Dashboard />} />
          <Route path="history" element={<History />} />
          <Route path="strategy" element={<Strategy />} />
          <Route path="committee" element={<Committee />} />
          <Route path="system" element={<System />} />
          <Route path="transparency" element={<Transparency />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
