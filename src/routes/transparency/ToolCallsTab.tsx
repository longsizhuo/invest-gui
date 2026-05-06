import { useState } from "react";
import useSWR from "swr";
import { fetcher, type ToolCallsResponse } from "../../lib/api-client";
import { RoleBadge } from "../../components/StatusBadge";
import { shortTime } from "../../lib/format";

/**
 * Tool 调用历史 — agent 主动查了哪些数据
 *
 * 让用户/外部 agent 看到 "Quant Round 1 在 18:05:23 主动调了 analyze_multi_timeframe(NDQ.AX) 拿了 RSI/MA"
 * 这是反向 agent 读取的关键 — 它能知道决策依据查了什么数据
 */
export function ToolCallsTab() {
  const [filter, setFilter] = useState({ asset: "", role: "" });

  const queryParams = new URLSearchParams();
  queryParams.set("since", "200");
  if (filter.asset) queryParams.set("asset", filter.asset);
  if (filter.role) queryParams.set("role", filter.role);

  const { data, error, isLoading } = useSWR<ToolCallsResponse>(
    `/api/agents/tool_calls?${queryParams}`,
    fetcher,
  );

  if (isLoading) return <div className="text-zinc-400">加载中...</div>;
  if (error) return <div className="text-red-400">加载失败: {error.message}</div>;
  if (!data) return null;

  if (data.count === 0) {
    return (
      <div className="space-y-3">
        <FilterBar filter={filter} onChange={setFilter} />
        <div className="rounded-lg ring-1 ring-zinc-800 bg-zinc-900 p-6 text-center text-zinc-400">
          <p>暂无 tool 调用记录。</p>
          <p className="text-xs mt-2">
            每次 agent 主动调 tool（5 个之一）会自动落盘到{" "}
            <code className="bg-zinc-950 px-1 rounded">memory/.state/tool_calls.jsonl</code>
            。下次 daily_report 跑后会有数据。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <FilterBar filter={filter} onChange={setFilter} />
      <p className="text-xs text-zinc-500">
        共 {data.count} 条调用记录（最新在前）
      </p>
      <div className="space-y-2 max-h-[70vh] overflow-y-auto">
        {data.records.map((r, i) => (
          <div key={i} className="rounded-lg ring-1 ring-zinc-800 bg-zinc-900 p-3">
            <div className="flex items-baseline justify-between mb-2">
              <div className="flex items-center gap-2 text-xs">
                <RoleBadge role={r.agent_role} />
                <code className="font-mono text-gold-400">{r.tool_name}</code>
                {r.asset && (
                  <span className="text-zinc-500">on {r.asset}</span>
                )}
                {r.round && (
                  <span className="text-zinc-500">@ {r.round}</span>
                )}
                {r.iteration > 0 && (
                  <span className="text-zinc-500">iter {r.iteration}</span>
                )}
              </div>
              <div className="text-xs text-zinc-500 tabular-nums">
                {shortTime(r.ts)} · {r.latency_ms} ms
              </div>
            </div>
            <details>
              <summary className="text-xs text-zinc-400 cursor-pointer">
                参数 + 结果预览（点击展开）
              </summary>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <div className="rounded bg-zinc-950/60 border border-zinc-800 p-2">
                  <div className="text-xs text-zinc-500 mb-1">参数</div>
                  <pre className="text-xs text-zinc-300 whitespace-pre-wrap">
                    {JSON.stringify(r.arguments, null, 2)}
                  </pre>
                </div>
                <div className="rounded bg-zinc-950/60 border border-zinc-800 p-2">
                  <div className="text-xs text-zinc-500 mb-1">返回（前 200 字）</div>
                  <pre className="text-xs text-zinc-300 whitespace-pre-wrap">
                    {r.result_preview}
                  </pre>
                </div>
              </div>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}

function FilterBar({
  filter,
  onChange,
}: {
  filter: { asset: string; role: string };
  onChange: (f: { asset: string; role: string }) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <label className="text-xs text-zinc-500">过滤：</label>
      <input
        placeholder="asset (如 NDQ.AX)"
        value={filter.asset}
        onChange={(e) => onChange({ ...filter, asset: e.target.value })}
        className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs font-mono"
      />
      <select
        value={filter.role}
        onChange={(e) => onChange({ ...filter, role: e.target.value })}
        className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs"
      >
        <option value="">全部角色</option>
        <option value="macro">macro</option>
        <option value="quant">quant</option>
        <option value="risk">risk</option>
        <option value="cio">cio</option>
      </select>
    </div>
  );
}
