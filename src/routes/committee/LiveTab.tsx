import { useState } from "react";
import {
  ApiError,
  postJSON,
  type CommitteeRunResponse,
} from "../../lib/api-client";
import { Button } from "../../components/Button";
import { StatusBadge } from "../../components/StatusBadge";
import { useCommitteeLive } from "../../lib/useCommitteeLive";
import { preciseTime, durationBetween } from "../../lib/format";

/**
 * Committee · Live tab —— 触发新一次委员会 + SSE 直播
 *
 * 实际耗时：v3 真并行 + 收敛提前退出后，~15-60s 跑完（旧文案"6 分钟"已废）。
 * 状态走 SSE 实时推送（25s keepalive 防 CF Access 5min idle 超时）。
 */
export function LiveTab() {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { status, connState } = useCommitteeLive(taskId);
  const isRunning = status?.status === "queued" || status?.status === "running";

  async function start() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await postJSON<{ note?: string }, CommitteeRunResponse>(
        "/api/committee/run",
        { note: "via invest-gui" },
      );
      setTaskId(res.task_id);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-[var(--text-primary)]">手动触发完整委员会</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              和命令行 <code className="bg-[var(--surface-base)] px-1">/run</code>{" "}
              等效 · 多资产并行 + 收敛提前退出 · 通常 15-60 秒
            </p>
          </div>
          <Button onClick={start} disabled={submitting || isRunning}>
            {submitting ? "提交中…" : isRunning ? "运行中…" : "启动委员会"}
          </Button>
        </div>

        {error && <p className="text-sm text-neg">{error}</p>}

        {taskId && (
          <div className="border-t border-[var(--border-subtle)] pt-4 space-y-3 tabular-nums">
            <div className="flex items-baseline gap-3 flex-wrap text-xs">
              <span className="text-[var(--text-tertiary)] uppercase tracking-wider">
                Task
              </span>
              <code className="text-[var(--text-primary)] font-mono">{taskId}</code>
              {status && <StatusBadge status={status.status} />}
              <SseIndicator state={connState} />
            </div>

            {status && (
              <div className="text-xs text-[var(--text-tertiary)] font-mono">
                开始 {preciseTime(status.started_at)}
                {status.ended_at && (
                  <>
                    {" · 结束 "}
                    {preciseTime(status.ended_at)}
                    {" · 耗时 "}
                    <span className="text-[var(--text-secondary)]">
                      {durationBetween(status.started_at, status.ended_at)}
                    </span>
                  </>
                )}
              </div>
            )}

            {status?.status === "running" && (
              <div className="text-sm text-[var(--text-primary)]">
                <span className="inline-block animate-pulse">
                  委员会正在跑…
                </span>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">
                  SSE 已订阅 · 可离开此页，结果落盘到 memory/.committee/
                </p>
              </div>
            )}

            {status?.status === "done" && status.result && (
              <div className="border border-[var(--border-subtle)] bg-[var(--surface-base)] p-3">
                <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                  daily_report 返回
                </p>
                <pre className="text-xs text-[var(--text-primary)] whitespace-pre-wrap break-all max-h-96 overflow-auto font-mono">
                  {JSON.stringify(status.result, null, 2)}
                </pre>
              </div>
            )}

            {status?.status === "error" && (
              <div className="chip-neg border border-[var(--neg)] p-3 text-sm">
                {status.error ?? "未知错误"}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SseIndicator({
  state,
}: {
  state: "idle" | "connecting" | "live" | "closed" | "error";
}) {
  const labels: Record<string, { text: string; cls: string }> = {
    idle: { text: "未连接", cls: "text-[var(--text-tertiary)]" },
    connecting: { text: "连接中…", cls: "text-warn" },
    live: { text: "● SSE 直播", cls: "text-pos" },
    closed: { text: "已关闭", cls: "text-[var(--text-tertiary)]" },
    error: { text: "断开", cls: "text-neg" },
  };
  const { text, cls } = labels[state];
  return <span className={`text-xs font-mono ${cls}`}>{text}</span>;
}
