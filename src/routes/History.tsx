import useSWR from "swr";
import { useState } from "react";
import { fetcher, type HistoryResponse } from "../lib/api-client";
import { formatCNY, shortTime } from "../lib/format";

/** 交易流水：表格展示，按 symbol 过滤，最多显示 200 条 */
export default function History() {
  const [filter, setFilter] = useState<string>("");
  const { data, error, isLoading } = useSWR<HistoryResponse>("/api/history?limit=200", fetcher);

  if (isLoading) return <div className="text-zinc-400">加载历史中...</div>;
  if (error) return <div className="text-red-400">加载失败: {error.message}</div>;
  if (!data) return null;

  const symbols = Array.from(new Set(data.rows.map((r) => r.symbol).filter(Boolean) as string[])).sort();
  const rows = filter ? data.rows.filter((r) => r.symbol === filter) : data.rows;

  return (
    <div className="space-y-4">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">交易流水</h1>
          <p className="text-xs text-zinc-500">最近 {data.count} 笔（按时间倒序）</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-500">资产过滤</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm"
          >
            <option value="">全部</option>
            {symbols.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="rounded-lg ring-1 ring-zinc-800 overflow-hidden">
        <table className="w-full text-sm tabular-nums">
          <thead className="bg-zinc-900 text-zinc-400 text-xs">
            <tr>
              <th className="px-3 py-2 text-left font-medium">时间</th>
              <th className="px-3 py-2 text-left font-medium">动作</th>
              <th className="px-3 py-2 text-left font-medium">资产</th>
              <th className="px-3 py-2 text-right font-medium">数量</th>
              <th className="px-3 py-2 text-right font-medium">单价</th>
              <th className="px-3 py-2 text-right font-medium">金额</th>
              <th className="px-3 py-2 text-left font-medium">来源</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-zinc-500 py-6">
                  暂无记录
                </td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-zinc-800 hover:bg-zinc-900/40">
                <td className="px-3 py-2 text-zinc-400">{shortTime(r.ts_origin ?? r.ts)}</td>
                <td className="px-3 py-2">
                  <ActionBadge action={r.action} />
                </td>
                <td className="px-3 py-2 text-zinc-200">{r.symbol ?? "—"}</td>
                <td className="px-3 py-2 text-right text-zinc-200">{r.units ?? "—"}</td>
                <td className="px-3 py-2 text-right text-zinc-200">
                  {r.price_per_unit != null ? formatCNY(r.price_per_unit) : "—"}
                </td>
                <td className="px-3 py-2 text-right text-zinc-200">
                  {r.total_amount != null ? formatCNY(r.total_amount) : "—"}
                </td>
                <td className="px-3 py-2 text-zinc-500 text-xs">{r.source ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActionBadge({ action }: { action: string | null | undefined }) {
  if (!action) return <span className="text-zinc-500">—</span>;
  const colors: Record<string, string> = {
    bought: "bg-green-500/20 text-green-300 ring-green-500/30",
    sold: "bg-red-500/20 text-red-300 ring-red-500/30",
    deposit: "bg-blue-500/20 text-blue-300 ring-blue-500/30",
    withdraw: "bg-orange-500/20 text-orange-300 ring-orange-500/30",
  };
  const cls = colors[action] ?? "bg-zinc-700/40 text-zinc-300 ring-zinc-600";
  return <span className={`rounded px-2 py-0.5 text-xs ring-1 ${cls}`}>{action}</span>;
}
