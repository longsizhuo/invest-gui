/**
 * 通用状态徽章 — 三类
 *
 * - VerdictBadge: BUY/SELL 是真语义（涨跌方向），用 pos/neg；HOLD/TRIM 中性
 * - RoleBadge: macro/quant/risk/cio —— 角色是结构信息，纯灰阶 + 等宽字
 * - StatusBadge: queued/running/done/error 是状态，用 warn/pos/neg
 *
 * 颜色判断的原则：
 *   能映射到"涨/跌"或"成/败"的才用色；纯标签分类用 mono + 边框
 */
const VERDICT_COLORS: Record<string, string> = {
  BUY: "chip-pos border border-[var(--pos)]",
  ACCUMULATE: "chip-pos border border-[var(--pos)]",
  HOLD: "border border-[var(--border-strong)] text-[var(--text-secondary)]",
  TRIM: "chip-warn border border-[var(--warn)]",
  SELL: "chip-neg border border-[var(--neg)]",
};

const STATUS_COLORS: Record<string, string> = {
  queued: "border border-[var(--border-strong)] text-[var(--text-secondary)]",
  running: "chip-warn border border-[var(--warn)]",
  done: "chip-pos border border-[var(--pos)]",
  error: "chip-neg border border-[var(--neg)]",
};

const FALLBACK =
  "border border-[var(--border-subtle)] text-[var(--text-tertiary)]";

const BADGE_BASE =
  "inline-flex items-center px-2 py-0.5 text-[11px] font-mono uppercase tracking-wider";

export function VerdictBadge({ verdict }: { verdict: string | null | undefined }) {
  if (!verdict) return <span className="text-[var(--text-tertiary)]">—</span>;
  return (
    <span className={`${BADGE_BASE} ${VERDICT_COLORS[verdict] ?? FALLBACK}`}>
      {verdict}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={
        `${BADGE_BASE} border border-[var(--border-subtle)] text-[var(--text-secondary)]`
      }
    >
      {role}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`${BADGE_BASE} ${STATUS_COLORS[status] ?? FALLBACK}`}>
      {status}
    </span>
  );
}
