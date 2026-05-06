/**
 * 多币种现金卡（v2 通用化）
 *
 * 显示：
 * - 主币种 CNY 大字（如果有）
 * - 其他币种小字平铺
 * - 0 余额币种依然显示（让用户知道账户存在）
 */
export function CashSummaryCard({ cash }: { cash: Record<string, number> }) {
  const entries = Object.entries(cash).sort(([a], [b]) => {
    // CNY 总是排第一
    if (a === "CNY") return -1;
    if (b === "CNY") return 1;
    return a.localeCompare(b);
  });

  if (entries.length === 0) {
    return (
      <div className="rounded-lg bg-zinc-900 p-4 ring-1 ring-zinc-700">
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">现金</h3>
        <p className="text-zinc-500 text-sm">（暂无现金记录）</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-zinc-900 p-4 ring-1 ring-blue-500/30">
      <h3 className="text-sm font-semibold text-zinc-300 mb-3">现金</h3>
      <div className="space-y-2 tabular-nums">
        {entries.map(([ccy, amt]) => (
          <div key={ccy} className="flex items-baseline justify-between">
            <span className="text-xs text-zinc-500 font-mono">{ccy}</span>
            <span className={`text-base ${amt < 0 ? "text-red-400 font-semibold" : "text-zinc-100"}`}>
              {amt < 0 && "-"}
              {Math.abs(amt).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
