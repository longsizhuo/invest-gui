import { ReactNode } from "react";

/** 通用卡片：所有持仓/策略卡都用这个外壳 */
export function Card({
  title,
  subtitle,
  children,
  accent,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  accent?: "gold" | "blue" | "green";
}) {
  const accentRing = {
    gold: "ring-gold-500/30",
    blue: "ring-blue-500/30",
    green: "ring-green-500/30",
    undefined: "ring-zinc-700",
  }[accent ?? "undefined"];
  return (
    <div className={`rounded-lg bg-zinc-900 p-4 ring-1 ${accentRing}`}>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-300">{title}</h3>
        {subtitle && <span className="text-xs text-zinc-500">{subtitle}</span>}
      </div>
      <div className="space-y-1.5 tabular-nums">{children}</div>
    </div>
  );
}

export function Row({ label, value, valueClass }: { label: string; value: ReactNode; valueClass?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className={`text-sm ${valueClass ?? "text-zinc-100"}`}>{value}</span>
    </div>
  );
}
