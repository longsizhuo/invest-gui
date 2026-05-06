import { useState } from "react";
import useSWR from "swr";
import {
  fetcher,
  type Strategy as StrategyType,
  type TargetAsset,
} from "../lib/api-client";
import { Card, Row } from "../components/Card";
import { Button } from "../components/Button";
import { AllocationsDialog } from "../components/AllocationsDialog";
import { AssetDialog } from "../components/AssetDialog";
import { formatCNY, formatPct } from "../lib/format";

/** 策略页：目标比例 + 各资产 cap / 点差 / 费率 + 编辑入口 */
export default function Strategy() {
  const { data, error, isLoading } = useSWR<StrategyType>("/api/strategy", fetcher);
  const [allocOpen, setAllocOpen] = useState(false);
  const [assetMode, setAssetMode] = useState<null | { mode: "create" } | { mode: "edit"; asset: TargetAsset }>(null);

  if (isLoading) return <div className="text-[var(--text-secondary)]">加载策略中...</div>;
  if (error) return <div className="text-neg">加载失败: {error.message}</div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">投资策略</h1>
          <p className="text-xs text-[var(--text-tertiary)]">
            来自 memory/strategy.md，写入受 Pydantic schema 强约束
          </p>
        </div>
        <Button onClick={() => setAssetMode({ mode: "create" })}>+ 新增资产</Button>
      </header>

      <div className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">资产配置目标</h3>
          <button
            onClick={() => setAllocOpen(true)}
            className="text-xs text-[var(--accent)] hover:text-[var(--accent)]"
          >
            编辑
          </button>
        </div>
        <div className="space-y-1.5 tabular-nums">
          <Row
            label="股票/ETF 占比"
            value={formatPct(data.target_allocation_stock * 100, 0)}
          />
          <Row label="现金占比" value={formatPct(data.target_allocation_cash * 100, 0)} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {data.target_assets.map((a) => (
          <div key={a.symbol} className="relative">
            <Card
              title={`${a.display_name ?? a.symbol} (${a.symbol})`}
              subtitle={a.channel ?? undefined}
            >
              <Row label="单次上限" value={formatCNY(a.max_single_invest_cny)} />
              {a.price_offset_pct != null && (
                <Row label="渠道点差" value={formatPct(a.price_offset_pct * 100)} />
              )}
              {a.sell_fee_pct != null && (
                <Row label="卖出手续费" value={formatPct(a.sell_fee_pct * 100)} />
              )}
            </Card>
            <button
              onClick={() => setAssetMode({ mode: "edit", asset: a })}
              className="absolute top-3 right-3 text-xs text-[var(--accent)] hover:text-[var(--accent)] px-2 py-0.5 rounded border border-[var(--border-strong)] bg-[var(--surface-raised)]"
            >
              编辑
            </button>
          </div>
        ))}
      </div>

      <AllocationsDialog
        open={allocOpen}
        onClose={() => setAllocOpen(false)}
        stock={data.target_allocation_stock}
        cash={data.target_allocation_cash}
      />

      <AssetDialog
        mode={assetMode?.mode ?? "create"}
        open={assetMode !== null}
        onClose={() => setAssetMode(null)}
        asset={assetMode?.mode === "edit" ? assetMode.asset : undefined}
      />
    </div>
  );
}
