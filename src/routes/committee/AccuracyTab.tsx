import useSWR from "swr";
import {
  fetcher,
  type VerdictReviewSummary,
  type VerdictReviewReportResponse,
} from "../../lib/api-client";
import { VerdictBadge } from "../../components/StatusBadge";

/**
 * 历史命中率 — 事后真实数据，建立信任
 *
 * 关键展示：
 * - 总命中率（按时间窗口）
 * - 按 verdict 类型拆分（HOLD 命中率高是统计假象，标注解读）
 * - 剔除 HOLD 后真实方向性命中率（marketing 诚实数据）
 */
export function AccuracyTab() {
  const { data: summary } = useSWR<VerdictReviewSummary>(
    "/api/verdict_review/summary",
    fetcher,
  );
  const { data: report } = useSWR<VerdictReviewReportResponse>(
    "/api/verdict_review/report",
    fetcher,
  );

  if (!summary) return <div className="text-[var(--text-secondary)]">加载中...</div>;

  if (summary.total === 0) {
    return (
      <div className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6 text-center text-[var(--text-secondary)]">
        <p>暂无 verdict review 数据。</p>
        <p className="text-xs mt-2 text-[var(--text-tertiary)]">
          历史命中率数据需积累一段时间后自动生成，无需手动操作。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 顶部 KPI */}
      <div className="grid gap-3 md:grid-cols-3">
        <KpiCard
          label="总决议数"
          value={String(summary.total)}
          hint="含 live + backtest"
        />
        <KpiCard
          label="整体命中率（30d）"
          value={(() => {
            const w30 = summary.by_window["30d"] as { hit_rate?: number; n?: number } | undefined;
            return w30?.hit_rate != null
              ? `${(w30.hit_rate * 100).toFixed(1)}%`
              : "—";
          })()}
          hint={`n=${(summary.by_window["30d"] as { n?: number } | undefined)?.n ?? 0}（含 HOLD）`}
        />
        <KpiCard
          label="真实方向性命中（剔除 HOLD）"
          value={summary.directional_only_hit_rate != null
            ? `${(summary.directional_only_hit_rate * 100).toFixed(1)}%`
            : "—"}
          hint="BUY/ACCUMULATE/TRIM/SELL 七日命中"
          highlight={summary.directional_only_hit_rate != null && summary.directional_only_hit_rate < 0.5}
        />
      </div>

      {/* 诚实解读 banner */}
      {summary.directional_only_hit_rate != null && summary.directional_only_hit_rate < 0.5 && (
        <div className="border border-[var(--warn)] chip-warn p-4 text-sm">
          <strong className="text-warn">诚实解读：</strong>
          <span className="text-[var(--text-primary)] ml-2">
            HOLD 占多数推高了"整体命中率"（HOLD 是 "市场没动 = 对" 的统计假象）。
            剔除后真实方向性命中{" "}
            <span className="font-bold text-warn tabular-nums">
              {(summary.directional_only_hit_rate * 100).toFixed(1)}%
            </span>
            ，反映系统目前在方向性预测上还不强，价值在于风险控制与执行纪律，不是预测准确率。
          </span>
        </div>
      )}

      {/* 按时间窗口 */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">按时间窗口</h3>
        <div className="border border-[var(--border-subtle)] overflow-hidden">
          <table className="w-full text-sm tabular-nums">
            <thead className="bg-[var(--surface-raised)] text-[var(--text-secondary)] text-xs">
              <tr>
                <th className="px-3 py-2 text-left">窗口</th>
                <th className="px-3 py-2 text-right">N</th>
                <th className="px-3 py-2 text-right">命中率</th>
                <th className="px-3 py-2 text-left">命中率条</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(summary.by_window).map(([w, raw]) => {
                // OpenAPI Dict[str, Any] 映射成 Record<string, unknown>，需要断言成具体形状
                const v = raw as { n: number; hit_rate: number };
                return (
                  <tr key={w} className="border-t border-[var(--border-subtle)]">
                    <td className="px-3 py-2 text-[var(--text-primary)] font-mono">{w}</td>
                    <td className="px-3 py-2 text-right text-[var(--text-secondary)]">{v.n}</td>
                    <td className="px-3 py-2 text-right text-[var(--accent)]">
                      {(v.hit_rate * 100).toFixed(1)}%
                    </td>
                    <td className="px-3 py-2">
                      <Bar pct={v.hit_rate * 100} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 按 verdict 类型 */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">按 verdict 类型</h3>
        <div className="border border-[var(--border-subtle)] overflow-hidden">
          <table className="w-full text-sm tabular-nums">
            <thead className="bg-[var(--surface-raised)] text-[var(--text-secondary)] text-xs">
              <tr>
                <th className="px-3 py-2 text-left">verdict</th>
                <th className="px-3 py-2 text-right">N</th>
                <th className="px-3 py-2 text-right">avg conf</th>
                <th className="px-3 py-2 text-right">1d</th>
                <th className="px-3 py-2 text-right">7d</th>
                <th className="px-3 py-2 text-right">30d</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(summary.by_verdict).map(([v, raw]) => {
                const d = raw as {
                  n: number;
                  avg_confidence: number;
                  hit_rate_1d: number | null;
                  hit_rate_7d: number | null;
                  hit_rate_30d: number | null;
                };
                return (
                  <tr key={v} className="border-t border-[var(--border-subtle)]">
                    <td className="px-3 py-2"><VerdictBadge verdict={v} /></td>
                    <td className="px-3 py-2 text-right text-[var(--text-secondary)]">{d.n}</td>
                    <td className="px-3 py-2 text-right text-[var(--text-secondary)]">{d.avg_confidence}</td>
                    <td className="px-3 py-2 text-right">{fmtPct(d.hit_rate_1d)}</td>
                    <td className="px-3 py-2 text-right">{fmtPct(d.hit_rate_7d)}</td>
                    <td className="px-3 py-2 text-right">{fmtPct(d.hit_rate_30d)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 完整 markdown 报告 */}
      {report?.exists && report.content && (
        <details className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3">
          <summary className="text-xs text-[var(--text-secondary)] cursor-pointer">
            📄 完整 markdown 报告（jobs/verdict_review 输出）
            {report.generated_at && <span className="ml-2">· 生成于 {report.generated_at}</span>}
          </summary>
          <pre className="mt-2 text-xs text-[var(--text-primary)] whitespace-pre-wrap max-h-[600px] overflow-auto">
            {report.content}
          </pre>
        </details>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`border p-4 ${highlight ? "border border-[var(--warn)] chip-warn" : "border border-[var(--border-subtle)] bg-[var(--surface-raised)]"}`}>
      <div className="text-xs text-[var(--text-tertiary)]">{label}</div>
      <div className={`text-2xl font-bold mt-1 tabular-nums ${highlight ? "text-warn" : "text-[var(--accent)]"}`}>
        {value}
      </div>
      {hint && <div className="text-xs text-[var(--text-tertiary)] mt-1">{hint}</div>}
    </div>
  );
}

function Bar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="w-full bg-[var(--surface-base)] rounded h-2 overflow-hidden">
      <div
        className="h-full bg-[var(--accent)] transition-all"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

function fmtPct(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${(v * 100).toFixed(0)}%`;
}
