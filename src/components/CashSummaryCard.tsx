/**
 * 多币种现金卡（v2 通用化）
 *
 * 显示：
 * - CNY 排首；其他币种按字母序
 * - 0 余额币种依然显示（让用户知道账户存在）
 * - 负数走 neg 语义色（应该不该出现，做防御）
 */
export function CashSummaryCard({ cash }: { cash: Record<string, number> }) {
  const entries = Object.entries(cash).sort(([a], [b]) => {
    if (a === "CNY") return -1;
    if (b === "CNY") return 1;
    return a.localeCompare(b);
  });

  if (entries.length === 0) {
    return (
      <article className="bg-[var(--surface-raised)] p-5 border border-[var(--border-subtle)]">
        <h3 className="text-sm font-medium text-[var(--text-primary)] mb-4">
          现金
        </h3>
        <p className="text-[var(--text-tertiary)] text-sm">暂无现金记录</p>
      </article>
    );
  }

  return (
    <article className="bg-[var(--surface-raised)] p-5 border border-[var(--border-subtle)]">
      <h3 className="text-sm font-medium text-[var(--text-primary)] mb-4">
        现金
      </h3>
      <div className="space-y-2.5 tabular-nums">
        {entries.map(([ccy, amt]) => (
          <div key={ccy} className="flex items-baseline justify-between gap-3">
            <span className="text-xs text-[var(--text-tertiary)] font-mono uppercase tracking-wider">
              {ccy}
            </span>
            <span
              className={
                "font-mono text-base " +
                (amt < 0
                  ? "text-neg font-medium"
                  : "text-[var(--text-primary)]")
              }
            >
              {amt < 0 && "-"}
              {Math.abs(amt).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}
