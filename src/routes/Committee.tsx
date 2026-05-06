import { useState } from "react";
import {
  ApiError,
  postJSON,
  type CommitteeRunResponse,
} from "../lib/api-client";
import { Button } from "../components/Button";
import { StatusBadge } from "../components/StatusBadge";
import { useCommitteeLive } from "../lib/useCommitteeLive";
import { shortTime } from "../lib/format";

/**
 * 委员会页：触发 daily_report 全套委员会（5 LLM × N 资产 ≈ 6min）
 *
 * v3 升级：用 SSE 替代轮询，状态变化实时推送（带 25s keepalive 防 CF idle 超时）
 */
export default function Committee() {
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
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold mb-1">投资委员会</h1>
        <p className="text-xs text-zinc-500">
          触发 daily_report：宏观分析 + 各资产 Quant/Risk/CIO 三轮辩论 + 邮件 brief。
          状态通过 SSE 实时推送（含 25s keepalive 防 CF Access 5min 超时）。
        </p>
      </header>

      <div className="rounded-lg ring-1 ring-zinc-800 bg-zinc-900 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-300">手动触发完整委员会</p>
            <p className="text-xs text-zinc-500 mt-1">
              和 NapCat <code className="bg-zinc-950 px-1 rounded">/run</code> 等效；约 6 分钟
            </p>
          </div>
          <Button onClick={start} disabled={submitting || isRunning}>
            {submitting
              ? "提交中..."
              : isRunning
                ? "运行中..."
                : "▶ 启动委员会"}
          </Button>
        </div>

        {error && <p className="text-sm text-red-400">⚠ {error}</p>}

        {taskId && (
          <div className="border-t border-zinc-800 pt-4 space-y-3 tabular-nums">
            <div className="flex items-baseline gap-3 flex-wrap text-xs">
              <span className="text-zinc-500">Task ID</span>
              <code className="text-zinc-300">{taskId}</code>
              {status && <StatusBadge status={status.status} />}
              <SseIndicator state={connState} />
            </div>

            {status && (
              <div className="text-xs text-zinc-500">
                开始 {shortTime(status.started_at)}
                {status.ended_at && <> · 结束 {shortTime(status.ended_at)}</>}
              </div>
            )}

            {status?.status === "running" && (
              <div className="text-sm text-zinc-300">
                <span className="inline-block animate-pulse">⏳ 委员会正在跑（约 6 分钟）...</span>
                <p className="text-xs text-zinc-500 mt-1">
                  SSE 已订阅；可离开此页，结果会落盘到 memory/.committee/
                </p>
              </div>
            )}

            {status?.status === "done" && status.result && (
              <div className="rounded bg-zinc-950/60 border border-zinc-800 p-3">
                <p className="text-xs text-zinc-400 mb-2">daily_report 返回</p>
                <pre className="text-xs text-zinc-200 whitespace-pre-wrap break-all max-h-96 overflow-auto">
                  {JSON.stringify(status.result, null, 2)}
                </pre>
              </div>
            )}

            {status?.status === "error" && (
              <div className="rounded bg-red-950/40 border border-red-900 p-3 text-sm text-red-200">
                ✗ {status.error ?? "未知错误"}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SseIndicator({ state }: { state: "idle" | "connecting" | "live" | "closed" | "error" }) {
  const labels: Record<string, { text: string; cls: string }> = {
    idle: { text: "未连接", cls: "text-zinc-500" },
    connecting: { text: "连接中...", cls: "text-amber-400" },
    live: { text: "● SSE 直播", cls: "text-green-400" },
    closed: { text: "已关闭", cls: "text-zinc-500" },
    error: { text: "断开（已无 keepalive）", cls: "text-red-400" },
  };
  const { text, cls } = labels[state];
  return <span className={`text-xs ${cls}`}>{text}</span>;
}
