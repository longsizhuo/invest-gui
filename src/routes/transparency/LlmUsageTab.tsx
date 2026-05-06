import useSWR from "swr";
import {
  fetcher,
  type LlmSummaryResponse,
  type LlmUsageResponse,
} from "../../lib/api-client";
import { RoleBadge } from "../../components/StatusBadge";
import { shortTime } from "../../lib/format";

/**
 * LLM 用量页 — token / 成本 / 延迟
 *
 * 数据来自 memory/.state/llm_usage.jsonl，每次 LLM 调用一条
 * 第一次访问可能为空（要等下次 daily_report 跑积累数据）
 */
export function LlmUsageTab() {
  const { data: summary } = useSWR<LlmSummaryResponse>("/api/llm/summary", fetcher);
  const { data: usage } = useSWR<LlmUsageResponse>("/api/llm/usage?since=100", fetcher);

  if (!summary) return <div className="text-zinc-400">加载中...</div>;

  if (summary.total_calls === 0) {
    return (
      <div className="rounded-lg ring-1 ring-zinc-800 bg-zinc-900 p-6 text-center text-zinc-400">
        <p>暂无 LLM 用量数据。</p>
        <p className="text-xs mt-2">
          每次 daily_report / committee 跑会自动记录。下次 cron 触发是明天 10am
          （或手动 <code className="bg-zinc-950 px-1 rounded">/api/committee/run</code>）。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 顶部 KPI */}
      <div className="grid gap-3 md:grid-cols-4">
        <KpiCard label="总调用" value={String(summary.total_calls)} hint="次" />
        <KpiCard
          label="总成本"
          value={`¥${summary.total_cost_cny.toFixed(4)}`}
          hint="DeepSeek 估算"
        />
        <KpiCard
          label="总输入 tokens"
          value={summary.total_input_tokens.toLocaleString()}
        />
        <KpiCard
          label="总输出 tokens"
          value={summary.total_output_tokens.toLocaleString()}
        />
      </div>

      {/* 按 agent role 拆分 */}
      <section>
        <h3 className="text-sm font-semibold text-zinc-300 mb-2">按 agent 角色拆分</h3>
        <div className="rounded-lg ring-1 ring-zinc-800 overflow-hidden">
          <table className="w-full text-sm tabular-nums">
            <thead className="bg-zinc-900 text-zinc-400 text-xs">
              <tr>
                <th className="px-3 py-2 text-left">角色</th>
                <th className="px-3 py-2 text-right">调用</th>
                <th className="px-3 py-2 text-right">input tk</th>
                <th className="px-3 py-2 text-right">output tk</th>
                <th className="px-3 py-2 text-right">成本 ¥</th>
                <th className="px-3 py-2 text-right">avg latency</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(summary.by_role).map(([role, stats]) => (
                <tr key={role} className="border-t border-zinc-800">
                  <td className="px-3 py-2"><RoleBadge role={role} /></td>
                  <td className="px-3 py-2 text-right text-zinc-300">{stats.calls}</td>
                  <td className="px-3 py-2 text-right text-zinc-400">{stats.input_tokens.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-zinc-400">{stats.output_tokens.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-gold-400">{stats.cost_cny.toFixed(4)}</td>
                  <td className="px-3 py-2 text-right text-zinc-500">{stats.avg_latency_ms} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 最近调用明细 */}
      {usage && usage.records.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-zinc-300 mb-2">
            最近 {usage.count} 次调用
          </h3>
          <div className="rounded-lg ring-1 ring-zinc-800 overflow-hidden max-h-96 overflow-y-auto">
            <table className="w-full text-xs tabular-nums">
              <thead className="bg-zinc-900 text-zinc-500 sticky top-0">
                <tr>
                  <th className="px-2 py-1.5 text-left">时间</th>
                  <th className="px-2 py-1.5 text-left">角色</th>
                  <th className="px-2 py-1.5 text-left">资产</th>
                  <th className="px-2 py-1.5 text-left">round</th>
                  <th className="px-2 py-1.5 text-right">in</th>
                  <th className="px-2 py-1.5 text-right">out</th>
                  <th className="px-2 py-1.5 text-right">latency</th>
                  <th className="px-2 py-1.5 text-right">¥</th>
                  <th className="px-2 py-1.5 text-right">tools</th>
                </tr>
              </thead>
              <tbody>
                {usage.records.map((r, i) => (
                  <tr
                    key={i}
                    className={`border-t border-zinc-800 ${!r.ok ? "bg-red-950/20" : ""}`}
                  >
                    <td className="px-2 py-1 text-zinc-500">{shortTime(r.ts)}</td>
                    <td className="px-2 py-1"><RoleBadge role={r.agent_role} /></td>
                    <td className="px-2 py-1 text-zinc-400">{r.asset ?? "—"}</td>
                    <td className="px-2 py-1 text-zinc-500">{r.round ?? "—"}</td>
                    <td className="px-2 py-1 text-right text-zinc-400">{r.input_tokens}</td>
                    <td className="px-2 py-1 text-right text-zinc-400">{r.output_tokens}</td>
                    <td className="px-2 py-1 text-right text-zinc-500">{r.latency_ms} ms</td>
                    <td className="px-2 py-1 text-right text-gold-400">{r.cost_cny.toFixed(4)}</td>
                    <td className="px-2 py-1 text-right text-zinc-500">{r.tool_calls}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg ring-1 ring-zinc-800 bg-zinc-900 p-4">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-xl font-bold mt-1 tabular-nums text-gold-400">{value}</div>
      {hint && <div className="text-xs text-zinc-500 mt-1">{hint}</div>}
    </div>
  );
}
