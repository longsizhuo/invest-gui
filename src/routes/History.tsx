import useSWR from "swr";
import { useState } from "react";
import { fetcher, type HistoryResponse } from "../lib/api-client";
import { SWR_KEYS } from "../lib/swr-keys";
import { formatMoney, formatUnits, shortTime } from "../lib/format";
import { usePrivacy } from "../lib/privacy";

const MASK = "●●●●●";

/** 交易流水：表格展示，按 symbol 过滤，最多显示 200 条 */
export default function History() {
  const { enabled: privacyOn } = usePrivacy();
  const [filter, setFilter] = useState<string>("");
  const { data, error, isLoading } = useSWR<HistoryResponse>(SWR_KEYS.HISTORY, fetcher);

  if (isLoading) return <div className="text-[var(--text-secondary)]">加载历史中...</div>;
  if (error) return <div className="text-neg">加载失败: {error.message}</div>;
  if (!data) return null;

  const symbols = Array.from(new Set(data.rows.map((r) => r.symbol).filter(Boolean) as string[])).sort();
  const rows = filter ? data.rows.filter((r) => r.symbol === filter) : data.rows;

  return (
    <div className="space-y-4">
      {/* 移动端：标题和过滤器换行堆叠 */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold mb-1">交易流水</h1>
          <p className="text-xs text-[var(--text-tertiary)]">最近 {data.count} 笔（按时间倒序）</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--text-tertiary)]">资产过滤</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-[var(--surface-raised)] border border-[var(--border-strong)] rounded px-2 py-1 text-sm max-w-[140px]"
          >
            <option value="">全部</option>
            {symbols.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* overflow-x-auto：移动端横向滚动避免列溢出 */}
      <div className="border border-[var(--border-subtle)] overflow-x-auto">
        <table className="w-full text-sm tabular-nums min-w-[560px]">
          <thead className="bg-[var(--surface-raised)] text-[var(--text-secondary)] text-xs">
            <tr>
              <th className="px-3 py-2 text-left font-medium">时间</th>
              <th className="px-3 py-2 text-left font-medium">动作</th>
              <th className="px-3 py-2 text-left font-medium">资产</th>
              <th className="px-3 py-2 text-right font-medium">数量</th>
              <th className="px-3 py-2 text-right font-medium">单价</th>
              <th className="px-3 py-2 text-right font-medium">金额</th>
              <th className="px-3 py-2 text-left font-medium">来源</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-[var(--text-tertiary)] py-6">
                  暂无记录
                </td>
              </tr>
            )}
            {rows.map((r, i) => {
              const action = (r.action ?? "").toLowerCase();
              const isCash = action === "deposit" || action === "withdraw";
              // buy/sell(DCA/委员会/CLI) 写 `price`；旧 bought/sold + 黄金写 `price_per_unit`
              const pricePerUnit =
                r.price_per_unit ?? (r as { price?: number | null }).price ?? null;
              // 现金行金额落在 units（total_amount=null）；交易行 total_amount 缺失时用 units×单价 兜底
              const amount = isCash
                ? r.units
                : r.total_amount ??
                  (r.units != null && pricePerUnit != null ? r.units * pricePerUnit : null);
              return (
                <tr key={i} className="border-t border-[var(--border-subtle)] hover:bg-[var(--surface-raised)]/40">
                  <td className="px-3 py-2 text-[var(--text-secondary)]">{shortTime(r.ts_origin ?? r.ts)}</td>
                  <td className="px-3 py-2">
                    <ActionBadge action={r.action} />
                  </td>
                  <td className="px-3 py-2 text-[var(--text-primary)]">{r.symbol ?? "—"}</td>
                  {/* 现金行金额在「金额」列展示，数量列留空，避免数量/金额语义重叠 */}
                  <td className="px-3 py-2 text-right text-[var(--text-primary)]">
                    {isCash ? "—" : privacyOn ? MASK : formatUnits(r.units)}
                  </td>
                  <td className="px-3 py-2 text-right text-[var(--text-primary)]">
                    {isCash || pricePerUnit == null ? "—" : privacyOn ? MASK : formatMoney(pricePerUnit, r.currency)}
                  </td>
                  <td className="px-3 py-2 text-right text-[var(--text-primary)]">
                    {amount == null ? "—" : privacyOn ? MASK : formatMoney(amount, r.currency)}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-tertiary)] text-xs">{r.source ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActionBadge({ action }: { action: string | null | undefined }) {
  if (!action) return <span className="text-[var(--text-tertiary)]">—</span>;
  // bought/sold 是涨/跌方向，用 pos/neg；deposit/withdraw 中性结构
  const colors: Record<string, string> = {
    // API/CLI/DCA/委员会 写 buy/sell；旧导入 + NapCat 写 bought/sold —— 两套都给涨跌色
    buy: "chip-pos border border-[var(--pos)]",
    bought: "chip-pos border border-[var(--pos)]",
    sell: "chip-neg border border-[var(--neg)]",
    sold: "chip-neg border border-[var(--neg)]",
    deposit: "border border-[var(--border-strong)] text-[var(--text-primary)]",
    withdraw: "border border-[var(--border-strong)] text-[var(--text-secondary)]",
  };
  const cls =
    colors[action] ??
    "border border-[var(--border-subtle)] text-[var(--text-tertiary)]";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-mono uppercase tracking-wider ${cls}`}
    >
      {action}
    </span>
  );
}
