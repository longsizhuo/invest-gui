/**
 * 通用状态徽章 - 5 种 verdict + 通用 label。
 * 供命中率页、委员会库页、SSE 直播复用，避免每处都写颜色映射
 */
const VERDICT_COLORS: Record<string, string> = {
  BUY: "bg-green-500/20 text-green-300 ring-green-500/30",
  ACCUMULATE: "bg-green-500/20 text-green-300 ring-green-500/30",
  HOLD: "bg-zinc-700/40 text-zinc-300 ring-zinc-600",
  TRIM: "bg-orange-500/20 text-orange-300 ring-orange-500/30",
  SELL: "bg-red-500/20 text-red-300 ring-red-500/30",
};

const ROLE_COLORS: Record<string, string> = {
  macro: "bg-purple-500/20 text-purple-300 ring-purple-500/30",
  quant: "bg-blue-500/20 text-blue-300 ring-blue-500/30",
  risk: "bg-orange-500/20 text-orange-300 ring-orange-500/30",
  cio: "bg-gold-500/20 text-gold-300 ring-gold-500/30",
};

const STATUS_COLORS: Record<string, string> = {
  queued: "bg-blue-500/20 text-blue-300 ring-blue-500/30",
  running: "bg-amber-500/20 text-amber-300 ring-amber-500/30",
  done: "bg-green-500/20 text-green-300 ring-green-500/30",
  error: "bg-red-500/20 text-red-300 ring-red-500/30",
};

const FALLBACK = "bg-zinc-700/40 text-zinc-300 ring-zinc-600";

export function VerdictBadge({ verdict }: { verdict: string | null | undefined }) {
  if (!verdict) return <span className="text-zinc-500">—</span>;
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs ring-1 ${VERDICT_COLORS[verdict] ?? FALLBACK}`}>
      {verdict}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs ring-1 font-mono ${ROLE_COLORS[role] ?? FALLBACK}`}>
      {role}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs ring-1 ${STATUS_COLORS[status] ?? FALLBACK}`}>
      {status}
    </span>
  );
}
