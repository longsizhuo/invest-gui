import type { HoldingV2 } from "../lib/api-client";

/**
 * 单个 holding 通用卡片：自适应任意 yfinance symbol
 *
 * 显示：
 * - display_name + symbol + channel
 * - 持仓 units + unit_label（股/克/oz...）
 * - 均价 + 实时价 + 浮盈
 * - 追踪仓有 🔍 标记，不显示 P&L
 * - 行情陈旧时 ⚠ 标记
 */
export function HoldingCard({ h }: { h: HoldingV2 }) {
  const isTracking = h.is_tracking_only;
  const ringColor = isTracking
    ? "ring-zinc-700"
    : (h.kind === "metal" ? "ring-gold-500/30"
      : h.kind === "crypto" ? "ring-orange-500/30"
      : "ring-blue-500/30");
  const accent =
    h.pnl == null ? "text-zinc-300"
    : h.pnl >= 0 ? "text-green-400 font-semibold"
    : "text-red-400 font-semibold";

  return (
    <div className={`rounded-lg bg-zinc-900 p-4 ring-1 ${ringColor}`}>
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">
            {isTracking && <span className="mr-1">🔍</span>}
            {h.display_name ?? h.symbol}
          </h3>
          <div className="text-xs text-zinc-500 font-mono">
            {h.symbol}
            {h.channel && <span className="ml-2">· {h.channel}</span>}
          </div>
        </div>
        <KindBadge kind={h.kind} />
      </div>

      <div className="space-y-1.5 tabular-nums text-sm">
        <Row label="持仓" value={`${h.units} ${h.unit_label}`} />
        {h.avg_cost > 0 && (
          <Row label="均价" value={`${formatNum(h.avg_cost)} ${h.cost_currency}/${h.unit_label}`} />
        )}
        {h.quote && (
          <>
            <Row
              label="实时价"
              value={
                <>
                  {formatNum(h.quote.price ?? 0)} {h.quote.currency}/{h.quote.unit ?? h.unit_label}
                  {h.quote.is_stale && <span className="ml-1 text-xs text-amber-400">⚠ 陈旧</span>}
                </>
              }
            />
            {(() => {
              // OpenAPI 通用 extra 字段在 TS 里是 {}，需要 as 断言成具体类型
              const dayChange = (h.quote.extra as { day_change_pct?: number } | null | undefined)?.day_change_pct;
              if (dayChange == null) return null;
              return (
                <Row
                  label="日变化"
                  value={formatPct(dayChange)}
                  valueClass={dayChange >= 0 ? "text-green-400" : "text-red-400"}
                />
              );
            })()}
            {h.quote.last_updated && (
              <Row label="行情日期" value={h.quote.last_updated} />
            )}
          </>
        )}
        {!isTracking && h.market_value != null && (
          <Row label="市值" value={`${formatNum(h.market_value)} ${h.cost_currency}`} />
        )}
        {!isTracking && h.pnl != null && (
          <Row
            label="浮盈"
            value={`${h.pnl >= 0 ? "+" : ""}${formatNum(h.pnl)} ${h.cost_currency}`}
            valueClass={accent}
          />
        )}
      </div>
    </div>
  );
}

function KindBadge({ kind }: { kind: string }) {
  const colors: Record<string, string> = {
    equity: "bg-blue-500/20 text-blue-300 ring-blue-500/30",
    etf: "bg-blue-500/20 text-blue-300 ring-blue-500/30",
    metal: "bg-gold-500/20 text-gold-400 ring-gold-500/30",
    crypto: "bg-orange-500/20 text-orange-300 ring-orange-500/30",
    bond: "bg-emerald-500/20 text-emerald-300 ring-emerald-500/30",
    fund: "bg-purple-500/20 text-purple-300 ring-purple-500/30",
    other: "bg-zinc-700/40 text-zinc-300 ring-zinc-600",
  };
  return (
    <span className={`rounded px-2 py-0.5 text-xs ring-1 ${colors[kind] ?? colors.other}`}>
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
    <div className="flex items-baseline justify-between">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className={valueClass ?? "text-zinc-100"}>{value}</span>
    </div>
  );
}

function formatNum(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

function formatPct(pct: number): string {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}
