import { useEffect, useRef } from "react";
import { useToast, type ToastSeverity } from "../components/Toast";
import type {
  FreshInsightsResponse,
  ReengagementResponse,
} from "./api-client";

// ─── 常量 ─────────────────────────────────────────────────────────────────────

/** 轮询间隔：60 秒 */
const POLL_INTERVAL_MS = 60_000;

// ─── useNudges ─────────────────────────────────────────────────────────────────

/**
 * 主动 nudge hook
 *
 * 挂载后立即：
 *   1. 拉 GET /api/insights/fresh，把每条新 insight 推 info toast
 *   2. 拉 GET /api/reengagement，把 alerts 按 severity 推 toast
 *
 * 之后每 60 秒轮询 /api/reengagement。
 * fresh insights 仅首次挂载拉一次（页面存活期间不重复拉）。
 *
 * 去重逻辑在 useToast.push 里已处理（localStorage hash TTL），
 * 这里只需直接调 push。
 */
export function useNudges(): void {
  const { push } = useToast();
  // 防止 StrictMode 下 double-effect 触发两次初始化
  const initialized = useRef(false);

  // 拉 fresh insights（仅首次，不轮询）
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    fetchFreshInsights(push);
  }, [push]);

  // 轮询 reengagement alerts
  useEffect(() => {
    // 立即执行一次，再设定定时器
    fetchReengagement(push);

    const timerId = setInterval(() => {
      fetchReengagement(push);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timerId);
  }, [push]);
}

// ─── 内部 fetch 函数 ──────────────────────────────────────────────────────────

/**
 * 拉 /api/insights/fresh，每条**没读过的** insight 推一条 info toast。
 *
 * 持久化"已弹过"的 slug 到 localStorage（key=insight slug → 弹出 ts）。Toast
 * 自带的 5 分钟 TTL 跨 session 后失效会重弹，这里按 slug 锁住，**永不重弹同一
 * 条 fresh insight**——避免 PM-1 v2 找出的 "用户每天开页面看到相同 'AI 学到
 * 新模式' 通知" 问题。
 */
const FRESH_INSIGHT_STORAGE_KEY = "openinvest:nudged_fresh_insights";

async function fetchFreshInsights(
  push: (message: string, severity?: ToastSeverity) => void,
): Promise<void> {
  try {
    const res = await fetch("/api/insights/fresh", { credentials: "same-origin" });
    if (!res.ok) return;
    const data: FreshInsightsResponse = await res.json();

    // 读已弹过的 slug 集合
    let seen: Record<string, number> = {};
    try {
      seen = JSON.parse(localStorage.getItem(FRESH_INSIGHT_STORAGE_KEY) || "{}");
    } catch {
      seen = {};
    }

    let mutated = false;
    for (const item of data.items) {
      // 同 slug 已弹过 → 跳过；新 slug 才弹 + 记录
      if (item.slug in seen) continue;
      const msg = `AI 学到新模式：${item.title}`;
      push(msg, "info");
      seen[item.slug] = Date.now();
      mutated = true;
    }
    if (mutated) {
      localStorage.setItem(FRESH_INSIGHT_STORAGE_KEY, JSON.stringify(seen));
    }
  } catch {
    // 网络错误静默
  }
}

/** 拉 /api/reengagement，按 severity 排序后推 toast */
async function fetchReengagement(
  push: (message: string, severity?: ToastSeverity) => void,
): Promise<void> {
  try {
    const res = await fetch("/api/reengagement", { credentials: "same-origin" });
    if (!res.ok) return;
    const data: ReengagementResponse = await res.json();

    // 后端 severity 字段和 ToastSeverity 对应关系
    const severityMap: Record<string, ToastSeverity> = {
      info: "info",
      warn: "warn",
      urgent: "urgent",
    };

    // 按严重程度降序排列，确保 urgent 先弹
    const sorted = [...data.alerts].sort((a, b) => {
      const order: Record<string, number> = { urgent: 0, warn: 1, info: 2 };
      return (order[a.severity] ?? 2) - (order[b.severity] ?? 2);
    });

    for (const alert of sorted) {
      const sev: ToastSeverity = severityMap[alert.severity] ?? "info";
      push(alert.message, sev);
    }
  } catch {
    // 网络错误静默
  }
}
