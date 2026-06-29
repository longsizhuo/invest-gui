import useSWR from "swr";
import { fetcher, type DisciplineResponse } from "../lib/api-client";
import { SWR_KEYS } from "../lib/swr-keys";
import { usePrivacy } from "../lib/privacy";
import { Card } from "../components/Card";

/**
 * 纪律台账 —— 委员会可证明价值是「纪律 + 透明」而非 alpha（ADR-023）。
 * 读 /api/discipline：默认不作为率（HOLD 占比）+ 累计拦截冲动交易 + 反事实损益。
 *
 * 隐私：反事实 ¥ 金额在脱敏模式下打码（百分比 / 次数公共场合无害，不脱敏）。
 */
export default function Discipline() {
  const { data, error, isLoading } = useSWR<DisciplineResponse>(SWR_KEYS.DISCIPLINE, fetcher);
  const { enabled: privacyOn } = usePrivacy();

  if (isLoading) return <p className="p-4 text-[var(--text-secondary)]">加载中…</p>;
  if (error) {
    return <p className="p-4 text-neg">纪律台账加载失败：{(error as Error).message}</p>;
  }
  if (!data) return null;

  const { inaction, interventions } = data.summary;
  const holdPct = inaction.hold_rate == null ? "—" : `${Math.round(inaction.hold_rate * 100)}%`;
  // 反事实 ¥ 金额脱敏（保留 ¥ 前缀让人知道是金额）；百分比 / 次数不动
  const md = privacyOn ? data.markdown.replace(/¥\s*-?[\d,]+(\.\d+)?/g, "¥●●●") : data.markdown;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <header>
        <h1 className="font-display text-3xl text-[var(--text-primary)] mb-1">纪律台账</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          委员会可证明的价值是<strong className="text-[var(--text-primary)]">纪律与透明</strong>，不是 alpha（见 ADR-023）：
          默认不作为、拦下冲动交易。这里量化它「拦了什么、省/费了多少」。
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Stat
          label="默认不作为率"
          value={holdPct}
          hint={`HOLD ${inaction.hold} / ${inaction.total_verdicts} 次裁决`}
        />
        <Stat
          label="累计拦截冲动"
          value={`${interventions.total}`}
          hint="确定性规则改写 CIO 裁决的次数"
        />
      </div>

      <Card title="台账明细" subtitle="不作为率 + 拦截分类 + 反事实损益（正=拦错 / 负=拦对）">
        {data.markdown.trim() ? (
          <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-[var(--text-secondary)]">
            {md}
          </pre>
        ) : (
          <p className="text-sm text-[var(--text-tertiary)]">暂无纪律数据（还没有裁决 / 干预记录）。</p>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4">
      <div className="text-xs text-[var(--text-tertiary)]">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-[var(--text-primary)]">{value}</div>
      {hint && <div className="mt-1 text-xs text-[var(--text-tertiary)]">{hint}</div>}
    </div>
  );
}
