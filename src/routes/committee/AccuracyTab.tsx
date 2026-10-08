import useSWR from "swr";
import {
  fetcher,
  type VerdictReviewBucket,
  type VerdictReviewSummary,
  type VerdictReviewReportResponse,
} from "../../lib/api-client";
import { SWR_KEYS } from "../../lib/swr-keys";
import { VerdictBadge } from "../../components/StatusBadge";

/**
 * 历史命中率 — 事后真实数据，建立信任
 *
 * 后端按来源分三桶（ADR-022，2026-10 D4）：只有 live 是业绩，backtest / contaminated
 * 只列样本数并标注"非业绩"，绝不和 live 合成一个命中率。任何格子 n<30 后端给 null（红线 #2）。
 *
 * 关键展示（全部只取 live 桶）：
 * - 按时间窗口命中率
 * - 按 verdict 类型拆分（HOLD 命中率高是统计假象，标注解读）
 * - 剔除 HOLD 后真实方向性命中率
 */
export function AccuracyTab() {
  const { data: summary } = useSWR<VerdictReviewSummary>(
    SWR_KEYS.VERDICT_REVIEW_SUMMARY,
    fetcher,
  );
  const { data: report } = useSWR<VerdictReviewReportResponse>(
    SWR_KEYS.VERDICT_REVIEW_REPORT,
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

  const live = summary.live;
  const w30 = live.by_window["30d"] as { hit_rate?: number | null; n?: number } | undefined;
  const dir = live.directional_only_hit_rate;
  const nonPerf: VerdictReviewBucket[] = [summary.backtest, summary.contaminated].filter((b) => b.n > 0);

  return (
    <div className="space-y-6">
      {/* 顶部 KPI（只取 live 桶） */}
      <div className="grid gap-3 md:grid-cols-3">
        <KpiCard
          label="live 决议数"
          value={String(live.n)}
          hint={`只计实盘决议；回测/污染样本另列；周末休市资产的周末决议（=周五样本重复）${summary.weekend_dup_excluded} 条不计入`}
        />
        <KpiCard
          label="live 整体命中率（30d）"
          value={fmtPct(w30?.hit_rate, 1)}
          hint={`n=${w30?.n ?? 0}（含 HOLD）`}
        />
        <KpiCard
          label="真实方向性命中（剔除 HOLD）"
          value={fmtPct(dir, 1)}
          hint={`BUY/ACCUMULATE/TRIM/SELL 七日命中，n=${live.directional_n}`}
          highlight={dir != null && dir < 0.5}
        />
      </div>

      {live.rates_suppressed_sub30 && (
        <div className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4 text-sm text-[var(--text-secondary)]">
          live 样本 {live.n} 条，不足 30，暂不展示命中率（防小样本误读）。
        </div>
      )}

      {/* 诚实解读 banner */}
      {dir != null && dir < 0.5 && (
        <div className="border border-[var(--warn)] chip-warn p-4 text-sm">
          <strong className="text-warn">诚实解读：</strong>
          <span className="text-[var(--text-primary)] ml-2">
            HOLD 占多数推高了"整体命中率"（HOLD 是 "市场没动 = 对" 的统计假象）。
            剔除后真实方向性命中{" "}
            <span className="font-bold text-warn tabular-nums">{fmtPct(dir, 1)}</span>
            ，反映系统目前在方向性预测上还不强，价值在于风险控制与执行纪律，不是预测准确率。
          </span>
        </div>
      )}

      {/* 按时间窗口 */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">按时间窗口（live）</h3>
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
              {Object.entries(live.by_window).map(([w, raw]) => {
                // OpenAPI Dict[str, Any] 映射成 Record<string, unknown>，需要断言成具体形状
                const v = raw as { n: number; hit_rate: number | null };
                return (
                  <tr key={w} className="border-t border-[var(--border-subtle)]">
                    <td className="px-3 py-2 text-[var(--text-primary)] font-mono">{w}</td>
                    <td className="px-3 py-2 text-right text-[var(--text-secondary)]">{v.n}</td>
                    <td className="px-3 py-2 text-right text-[var(--accent)]">{fmtPct(v.hit_rate, 1)}</td>
                    <td className="px-3 py-2">
                      {v.hit_rate != null && <Bar pct={v.hit_rate * 100} />}
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
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">按 verdict 类型（live）</h3>
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
              {Object.entries(live.by_verdict).map(([v, raw]) => {
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
        <p className="text-xs mt-1 text-[var(--text-tertiary)]">"—" = 该格样本不足 30 或窗口未成熟。</p>
      </section>

      {/* 非业绩桶：只列样本数，不出命中率 */}
      {nonPerf.length > 0 && (
        <section className="text-xs text-[var(--text-tertiary)] space-y-1">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">另有非业绩样本（不计入上面任何数字）</h3>
          {nonPerf.map((b) => (
            <p key={b.label}>· {b.label}：{b.n} 条</p>
          ))}
        </section>
      )}

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

function fmtPct(v: number | null | undefined, digits = 0): string {
  if (v == null) return "—";
  return `${(v * 100).toFixed(digits)}%`;
}
