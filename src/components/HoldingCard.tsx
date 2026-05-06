import type { HoldingV2 } from "../lib/api-client";

/**
 * 单个 holding 通用卡片：自适应任意 yfinance symbol
 *
 * 显示：
 * - display_name + symbol + channel
 * - 持仓 units + unit_label（股/克/oz...）
 * - 均价 + 实时价 + 浮盈
 * - 追踪仓视觉降级（仅边框透明度变化），不显示 P&L
 * - 行情陈旧时 stale 标记
 *
 * 颜色策略：kind 标签纯灰阶（kind 是结构信息不是状态，不该用颜色）；
 * 涨跌 / 浮盈用 pos/neg 语义色；陈旧用 stale。
 */
export function HoldingCard({ h }: { h: HoldingV2 }) {
  const isTracking = h.is_tracking_only;
  const borderClass = isTracking
    ? "border border-dashed border-[var(--border-subtle)]"
    : "border border-[var(--border-subtle)]";

  const pnlClass =
    h.pnl == null
      ? "text-[var(--text-primary)]"
      : h.pnl >= 0
      ? "text-pos font-medium"
      : "text-neg font-medium";

  return (
    <article className={`bg-[var(--surface-raised)] p-5 ${borderClass}`}>
      <header className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-[var(--text-primary)] truncate">
            {h.display_name ?? h.symbol}
          </h3>
          <div className="text-xs text-[var(--text-tertiary)] font-mono mt-0.5 truncate">
            {h.symbol}
            {h.channel && <span className="ml-2">· {h.channel}</span>}
            {isTracking && <span className="ml-2 italic">追踪</span>}
          </div>
        </div>
        <KindBadge kind={h.kind} />
      </header>

      <div className="space-y-1.5 tabular-nums text-sm">
        <Row label="持仓" value={`${h.units} ${h.unit_label}`} />
        {h.avg_cost > 0 && (
          <Row
            label="均价"
            value={`${formatNum(h.avg_cost)} ${h.cost_currency}/${h.unit_label}`}
          />
        )}
        {h.quote && (
          <>
            <Row
              label="实时价"
              value={
                <>
                  {formatNum(h.quote.price ?? 0)} {h.quote.currency}/
                  {h.quote.unit ?? h.unit_label}
                  {h.quote.is_stale && (
                    <span className="ml-1.5 text-xs text-stale italic">陈旧</span>
                  )}
                </>
              }
            />
            {(() => {
              const dayChange = (
                h.quote.extra as { day_change_pct?: number } | null | undefined
              )?.day_change_pct;
              if (dayChange == null) return null;
              return (
                <Row
                  label="日变化"
                  value={formatPct(dayChange)}
                  valueClass={dayChange >= 0 ? "text-pos" : "text-neg"}
                />
              );
            })()}
            {h.quote.last_updated && (
              <Row label="行情日期" value={h.quote.last_updated} />
            )}
          </>
        )}
        {!isTracking && h.market_value != null && (
          <Row
            label="市值"
            value={`${formatNum(h.market_value)} ${h.cost_currency}`}
          />
        )}
        {!isTracking && h.pnl != null && (
          <Row
            label="浮盈"
            value={`${h.pnl >= 0 ? "+" : ""}${formatNum(h.pnl)} ${h.cost_currency}`}
            valueClass={pnlClass}
          />
        )}
      </div>
    </article>
  );
}

/** kind 标签：纯灰阶，结构信息不应用颜色 */
function KindBadge({ kind }: { kind: string }) {
  return (
    <span
      className={
        "px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider " +
        "border border-[var(--border-subtle)] text-[var(--text-tertiary)]"
      }
    >
      {kind}
    </span>
  );
}

function Row({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-[var(--text-tertiary)] shrink-0">
        {label}
      </span>
      <span
        className={
          "font-mono text-right " +
          (valueClass ?? "text-[var(--text-primary)]")
        }
      >
        {value}
      </span>
    </div>
  );
}

function formatNum(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

function formatPct(pct: number): string {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}
