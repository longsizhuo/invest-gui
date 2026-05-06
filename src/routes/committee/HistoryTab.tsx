import { useState } from "react";
import useSWR from "swr";
import {
  fetcher,
  type CommitteeSessionsResponse,
  type CommitteeSessionDetail,
} from "../../lib/api-client";
import { VerdictBadge } from "../../components/StatusBadge";

/**
 * Committee · 决议历史归档
 *
 * 左：所有 memory/.committee/<date>/<symbol>.md 列表
 * 右：选中行的完整 markdown body
 *
 * 和 AccuracyTab 区别：
 * - History 是单条决议的详细文档
 * - Accuracy 是聚合的命中率统计
 */
export function HistoryTab() {
  const { data, error, isLoading } = useSWR<CommitteeSessionsResponse>(
    "/api/committee_sessions?limit=100",
    fetcher,
  );
  const [selected, setSelected] = useState<{ date: string; symbol: string } | null>(null);

  if (isLoading)
    return <div className="text-[var(--text-secondary)]">加载中…</div>;
  if (error) return <div className="text-neg">失败: {error.message}</div>;
  if (!data) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div>
        <p className="text-xs text-[var(--text-tertiary)] mb-2 font-mono">
          共 {data.count} 个历史决议 · 点击看完整 memo
        </p>
        <div className="border border-[var(--border-subtle)] overflow-hidden max-h-[70vh] overflow-y-auto">
          <table className="w-full text-xs tabular-nums">
            <thead className="bg-[var(--surface-raised)] text-[var(--text-tertiary)] sticky top-0">
              <tr>
                <th className="px-2 py-1.5 text-left font-medium">日期</th>
                <th className="px-2 py-1.5 text-left font-medium">资产</th>
                <th className="px-2 py-1.5 text-left font-medium">verdict</th>
                <th className="px-2 py-1.5 text-right font-medium">conf</th>
                <th className="px-2 py-1.5 text-right font-medium">建议 ¥</th>
              </tr>
            </thead>
            <tbody>
              {data.sessions.map((s, i) => {
                const isActive =
                  selected?.date === s.date && selected?.symbol === s.symbol;
                return (
                  <tr
                    key={i}
                    onClick={() => setSelected({ date: s.date, symbol: s.symbol })}
                    className={`border-t border-[var(--border-subtle)] cursor-pointer hover:bg-[var(--surface-raised)] ${
                      isActive ? "bg-[var(--surface-overlay)]" : ""
                    }`}
                  >
                    <td className="px-2 py-1 text-[var(--text-secondary)] font-mono">
                      {s.date}
                    </td>
                    <td className="px-2 py-1 font-mono text-[var(--text-primary)]">
                      {s.symbol}
                    </td>
                    <td className="px-2 py-1">
                      <VerdictBadge verdict={s.verdict ?? null} />
                    </td>
                    <td className="px-2 py-1 text-right text-[var(--text-secondary)] font-mono">
                      {s.confidence ?? "—"}
                    </td>
                    <td
                      className={`px-2 py-1 text-right font-mono ${
                        s.suggested_alloc_cny == null
                          ? "text-[var(--text-tertiary)]"
                          : s.suggested_alloc_cny > 0
                            ? "text-pos"
                            : s.suggested_alloc_cny < 0
                              ? "text-neg"
                              : "text-[var(--text-primary)]"
                      }`}
                    >
                      {s.suggested_alloc_cny != null
                        ? (s.suggested_alloc_cny > 0 ? "+" : "") +
                          s.suggested_alloc_cny.toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        {selected ? (
          <CommitteeDetail date={selected.date} symbol={selected.symbol} />
        ) : (
          <div className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6 text-center text-[var(--text-tertiary)]">
            点击左侧任意决议看完整 markdown
          </div>
        )}
      </div>
    </div>
  );
}

function CommitteeDetail({ date, symbol }: { date: string; symbol: string }) {
  const { data } = useSWR<CommitteeSessionDetail>(
    `/api/committee_sessions/${encodeURIComponent(date)}/${encodeURIComponent(symbol)}`,
    fetcher,
  );
  if (!data)
    return <div className="text-[var(--text-tertiary)]">加载…</div>;
  return (
    <div className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4 max-h-[70vh] overflow-y-auto">
      <pre className="text-xs text-[var(--text-primary)] whitespace-pre-wrap font-mono">
        {data.content}
      </pre>
    </div>
  );
}
