import { useState } from "react";
import useSWR from "swr";
import { fetcher, type HoldingsListResponse, type HoldingV2 } from "../lib/api-client";
import { HoldingCard } from "../components/HoldingCard";
import { CashSummaryCard } from "../components/CashSummaryCard";
import { Button } from "../components/Button";
import { CashDialog } from "../components/CashDialog";
import { GoldTradeDialog } from "../components/GoldTradeDialog";
import { GoldOffsetDialog } from "../components/GoldOffsetDialog";
import { HoldingDialog } from "../components/HoldingDialog";
import { PnLChart } from "../components/PnLChart";
import { TradingViewChart } from "../components/TradingViewChart";

type DialogKind = null | "deposit" | "withdraw" | "gold_buy" | "gold_sell" | "gold_offset";

/**
 * v2 通用化主面板
 *
 * 数据源：/api/holdings（cash dict + holdings list）
 * 行情：每个 holding 自带 quote 字段（后端从 yfinance/proxy 拉好）
 * 显示：CashSummary + holdings.map(HoldingCard) + 操作按钮区
 *
 * 任何新加的 yfinance symbol 都自动出现一张卡片，无需前端改代码
 */
export default function Dashboard() {
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [holdingDialog, setHoldingDialog] = useState<
    null | { mode: "create" } | { mode: "edit"; holding: HoldingV2 }
  >(null);
  const close = () => setDialog(null);

  const { data, error, isLoading } = useSWR<HoldingsListResponse>("/api/holdings", fetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
  });

  if (isLoading) return <div className="text-zinc-400">加载持仓中...</div>;
  if (error) return <div className="text-red-400">加载失败: {error.message}</div>;
  if (!data) return null;

  // 把追踪仓单独分组，UI 上和实仓区分
  const realHoldings = data.holdings.filter((h) => !h.is_tracking_only);
  const trackingHoldings = data.holdings.filter((h) => h.is_tracking_only);

  // 决定 K 线展示哪个 symbol：默认第一个 holding；以后可以做多 tab
  const chartSymbols = data.holdings.slice(0, 4).map((h) => ({
    symbol: h.yfinance_proxy ?? h.symbol,
    label: h.display_name ?? h.symbol,
  }));

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">主面板</h1>
          <p className="text-xs text-zinc-500">
            每 30 秒自动刷新；行情来自 yfinance（或自定义 proxy）
          </p>
        </div>
        <Button onClick={() => setHoldingDialog({ mode: "create" })}>+ 新增资产</Button>
      </header>

      {/* 顶部：现金 + 实仓持仓 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <CashSummaryCard cash={data.cash} />
        {realHoldings.map((h) => (
          <div
            key={h.symbol}
            onClick={() => setHoldingDialog({ mode: "edit", holding: h })}
            className="cursor-pointer hover:scale-[1.01] transition-transform"
            title="点击编辑"
          >
            <HoldingCard h={h} />
          </div>
        ))}
      </div>

      {/* 追踪仓（可选区域） */}
      {trackingHoldings.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-zinc-400 mb-2">🔍 追踪仓（仅观察，不计 P&L）</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {trackingHoldings.map((h) => (
              <div
                key={h.symbol}
                onClick={() => setHoldingDialog({ mode: "edit", holding: h })}
                className="cursor-pointer hover:scale-[1.01] transition-transform"
                title="点击编辑"
              >
                <HoldingCard h={h} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 操作按钮区（v2 第一版仍然保留旧 dialog；阶段 4 加通用 HoldingDialog） */}
      <div className="rounded-lg ring-1 ring-zinc-800 bg-zinc-900/60 p-4">
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">资金动作</h2>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setDialog("deposit")}>存入现金</Button>
          <Button variant="ghost" onClick={() => setDialog("withdraw")}>取出现金</Button>
          <Button variant="ghost" onClick={() => setDialog("gold_buy")}>记买金</Button>
          <Button variant="ghost" onClick={() => setDialog("gold_sell")}>记卖金</Button>
          <Button variant="ghost" onClick={() => setDialog("gold_offset")}>校准浙商点差</Button>
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          注：通用资产 CRUD（任意 yfinance symbol）见「策略」页；后续会把这里也通用化
        </p>
      </div>

      {/* PnL 趋势 */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-300 mb-2">PnL 趋势 vs 8 基准</h2>
        <p className="text-xs text-zinc-500 mb-3">工作日每 2 小时自动刷新（jobs/pnl_snapshot）</p>
        <PnLChart />
      </section>

      {/* 行情 K 线（多资产自适应） */}
      {chartSymbols.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-zinc-300 mb-2">行情图表</h2>
          <p className="text-xs text-zinc-500 mb-3">
            来自 TradingView，浏览器侧加载，不占后端
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {chartSymbols.map((c) => (
              <div key={c.symbol}>
                <p className="text-xs text-zinc-400 mb-1">{c.label}</p>
                <TradingViewChart symbol={c.symbol} interval="D" height={340} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 对话框 */}
      <CashDialog mode="deposit" open={dialog === "deposit"} onClose={close} />
      <CashDialog mode="withdraw" open={dialog === "withdraw"} onClose={close} />
      <GoldTradeDialog mode="buy" open={dialog === "gold_buy"} onClose={close} />
      <GoldTradeDialog mode="sell" open={dialog === "gold_sell"} onClose={close} />
      <GoldOffsetDialog open={dialog === "gold_offset"} onClose={close} />

      {/* v2 通用 holding CRUD */}
      <HoldingDialog
        mode={holdingDialog?.mode ?? "create"}
        open={holdingDialog !== null}
        onClose={() => setHoldingDialog(null)}
        holding={holdingDialog?.mode === "edit" ? holdingDialog.holding : undefined}
      />
    </div>
  );
}
