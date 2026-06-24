import { useEffect, useRef, useState } from "react";
import type { CommitteeStatusResponse } from "./api-client";

export type LiveConnState = "idle" | "connecting" | "live" | "closed" | "error";

/**
 * SSE 订阅委员会任务状态
 *
 * 后端 /api/committee/live/{task_id} 推 4 类 event：
 * - progress: 状态变化（每次 status.json 改写时推一次）
 * - done / error / not_found / timeout: 终态，自动关连接
 *
 * EventSource 浏览器原生支持，CF Access cookie 会自动带上。
 *
 * 使用：
 *   const { status, connState } = useCommitteeLive(taskId);
 */
export function useCommitteeLive(taskId: string | null) {
  const [status, setStatus] = useState<CommitteeStatusResponse | null>(null);
  const [connState, setConnState] = useState<LiveConnState>("idle");
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!taskId) {
      setStatus(null);
      setConnState("idle");
      return;
    }
    setConnState("connecting");
    // 切到新 taskId 时清掉上一轮 status，否则新一轮首帧到来前会泄漏上轮的 done/result
    setStatus(null);
    const es = new EventSource(`/api/committee/live/${encodeURIComponent(taskId)}`);
    esRef.current = es;

    const handleProgress = (e: MessageEvent) => {
      setConnState("live");
      try {
        setStatus(JSON.parse(e.data));
      } catch {
        // 忽略非 JSON 推送
      }
    };
    const handleTerminal = (e: MessageEvent) => {
      try {
        setStatus(JSON.parse(e.data));
      } catch {
        // 忽略
      }
      setConnState("closed");
      es.close();
    };
    // 后端业务终态错误走具名 event:error（带 data）；浏览器连接级 error（瞬断，无 data）
    // 会派发到同一个 "error" 监听器——这种必须交给 es.onerror 的自动重连，绝不能 close，
    // 否则一次网络抖动就把还在跑的委员会直播永久关掉（keepalive 形同虚设）。
    const handleServerError = (e: Event) => {
      const data = (e as MessageEvent).data;
      if (!data) return;
      try {
        setStatus(JSON.parse(data));
      } catch {
        return;
      }
      setConnState("closed");
      es.close();
    };

    es.addEventListener("progress", handleProgress);
    es.addEventListener("done", handleTerminal);
    es.addEventListener("error", handleServerError);
    es.addEventListener("not_found", handleTerminal);
    es.addEventListener("timeout", handleTerminal);

    es.onerror = () => {
      // 浏览器内置自动重连；连接彻底断开时标 error
      if (es.readyState === EventSource.CLOSED) {
        setConnState("error");
      }
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [taskId]);

  return { status, connState };
}
