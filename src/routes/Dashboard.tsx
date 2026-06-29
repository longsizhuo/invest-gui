import { useState } from "react";
import { Link } from "react-router-dom";
import useSWR from "swr";
import {
  fetcher,
  type HoldingsListResponse,
  type HoldingV2,
  type CommitteeSessionSummary,
  type CommitteeSessionsResponse,
} from "../lib/api-client";
import { SWR_KEYS } from "../lib/swr-keys";
import { HoldingCard } from "../components/HoldingCard";
import { CashSummaryCard } from "../components/CashSummaryCard";
import { Button } from "../components/Button";
import { CashDialog } from "../components/CashDialog";
import { GoldTradeDialog } from "../components/GoldTradeDialog";
import { GoldOffsetDialog } from "../components/GoldOffsetDialog";
import { HoldingDialog } from "../components/HoldingDialog";
import { PnLChart } from "../components/PnLChart";
import { TradingViewChart } from "../components/TradingViewChart";
import { DashboardHero } from "../components/DashboardHero";
import { OutperformShareCard } from "../components/OutperformShareCard";
import { RecordModal } from "../components/RecordModal";
import { VerdictBadge } from "../components/StatusBadge";
import { verdictAction } from "../lib/format";
import { usePrivacy } from "../lib/privacy";

type DialogKind = null | "deposit" | "withdraw" | "gold_buy" | "gold_sell" | "gold_offset";

/**
 * v2 通用化主面板
 *
 * 数据源：/api/holdings（cash dict + holdings list）
 * 行情：每个 holding 自带 quote 字段（后端从 yfinance/proxy 拉好）
 * 显示：Hero landmark + CashSummary + holdings.map(HoldingCard) + 操作按钮区
 */
export default function Dashboard() {
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [holdingDialog, setHoldingDialog] = useState<
    null | { mode: "create" } | { mode: "edit"; holding: HoldingV2 }
  >(null);
  // 记账 modal 状态：null = 关闭，否则携带预填数据
  const [recordModal, setRecordModal] = useState<{
    defaultSymbol?: string;
    defaultDirection?: "BUY" | "SELL";
    verdictId?: string;
  } | null>(null);
  const close = () => setDialog(null);

  const { data, error, isLoading } = useSWR<HoldingsListResponse>(SWR_KEYS.HOLDINGS, fetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
  });

  if (isLoading)
    return <div className="text-[var(--text-secondary)]">加载持仓中…</div>;
  if (error)
    return (
      <div className="border border-[var(--neg)] bg-[var(--surface-raised)] p-6 space-y-2">
        <p className="text-sm text-neg font-semibold">持仓加载失败</p>
        <p className="text-xs text-[var(--text-secondary)]">{error.message}</p>
        <p className="text-xs text-[var(--text-tertiary)]">
          后端未启动？请先运行{" "}
          <code className="bg-[var(--surface-base)] px-1">run.sh serve</code>
          ，确认 <code className="bg-[var(--surface-base)] px-1">http://127.0.0.1:8765/api/health</code> 可访问。
        </p>
      </div>
    );
  if (!data) return null;

  const realHoldings = data.holdings.filter((h) => !h.is_tracking_only);
  const trackingHoldings = data.holdings.filter((h) => h.is_tracking_only);
  // 黄金按钮（浙商/CNY·g 等作者专属流程）仅在确实持金时显示，避免纯 A 股 fork 用户看到用不上的控件
  const hasGold = data.holdings.some(
    (h) => h.kind === "metal" || h.proxy_kind === "gold_cny_per_gram",
  );

  const chartSymbols = data.holdings.slice(0, 4).map((h) => ({
    symbol: h.yfinance_proxy ?? h.symbol,
    label: h.display_name ?? h.symbol,
  }));

  return (
    <div>
      {/* 跑赢基准分享卡：有数据时显示在最顶部，高度 < 80px 不喧宾夺主 */}
      <OutperformShareCard />

      {/* Hero landmark：总资产 + 上次委员会，进入页面第一眼看到的事实 */}
      <DashboardHero />

      {/* 页面操作区 */}
      <header className="flex items-baseline justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-[var(--text-primary)] mb-1">
            持仓
          </h1>
          <p className="text-xs text-[var(--text-tertiary)] font-mono">
            每 30 秒自动刷新 · 行情来自 yfinance
          </p>
        </div>
        <div className="flex gap-2">
          {/* 智能导入持仓（文本/CSV → LLM 解析） */}
          <Link to="/holdings/import-portfolio">
            <Button variant="outline">导入持仓</Button>
          </Link>
          {/* 批量录入历史交易入口 */}
          <Link to="/holdings/import">
            <Button variant="outline">批量导入</Button>
          </Link>
          <Button onClick={() => setHoldingDialog({ mode: "create" })}>
            新增资产
          </Button>
        </div>
      </header>

      {/* 现金 + 实仓持仓 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <CashSummaryCard cash={data.cash} />
        {realHoldings.map((h) => (
          <button
            key={h.symbol}
            type="button"
            onClick={() => setHoldingDialog({ mode: "edit", holding: h })}
            className="text-left transition-colors duration-100 hover:opacity-90"
            title="点击编辑"
          >
            <HoldingCard h={h} />
          </button>
        ))}
      </div>

      {/* 追踪仓 */}
      {trackingHoldings.length > 0 && (
        <section className="mt-10">
          <header className="flex items-baseline gap-3 mb-3">
            <h2 className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">
              追踪仓
            </h2>
            <span className="text-xs text-[var(--text-tertiary)]">
              · 仅观察，不计 P&L
            </span>
          </header>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {trackingHoldings.map((h) => (
              <button
                key={h.symbol}
                type="button"
                onClick={() => setHoldingDialog({ mode: "edit", holding: h })}
                className="text-left transition-colors duration-100 hover:opacity-90"
                title="点击编辑"
              >
                <HoldingCard h={h} />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 资金动作 */}
      <section className="mt-10 border-t border-[var(--border-subtle)] pt-6">
        <h2 className="text-xs uppercase tracking-widest text-[var(--text-tertiary)] mb-3">
          资金动作
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setDialog("deposit")}>存入现金</Button>
          <Button variant="outline" onClick={() => setDialog("withdraw")}>
            取出现金
          </Button>
          {hasGold && (
            <>
              <Button variant="outline" onClick={() => setDialog("gold_buy")}>
                记买金
              </Button>
              <Button variant="outline" onClick={() => setDialog("gold_sell")}>
                记卖金
              </Button>
              <Button variant="ghost" onClick={() => setDialog("gold_offset")}>
                校准黄金点差
              </Button>
            </>
          )}
        </div>
        <p className="text-xs text-[var(--text-tertiary)] mt-3">
          通用资产 CRUD（任意 yfinance symbol）见「策略」页
        </p>
      </section>

      {/* PnL 趋势 */}
      <section className="mt-10 border-t border-[var(--border-subtle)] pt-6">
        <header className="mb-4">
          <h2 className="font-display text-2xl text-[var(--text-primary)] mb-1">
            PnL 趋势
          </h2>
          <p className="text-xs text-[var(--text-tertiary)] font-mono">
            vs 8 基准 · 工作日每 2 小时自动刷新
          </p>
        </header>
        <PnLChart />
      </section>

      {/* 行情 K 线 */}
      {chartSymbols.length > 0 && (
        <section className="mt-10 border-t border-[var(--border-subtle)] pt-6">
          <header className="mb-4">
            <h2 className="font-display text-2xl text-[var(--text-primary)] mb-1">
              行情图表
            </h2>
            <p className="text-xs text-[var(--text-tertiary)] font-mono">
              TradingView · 浏览器侧加载
            </p>
          </header>
          <div className="grid gap-4 md:grid-cols-2">
            {chartSymbols.map((c) => (
              <div key={c.symbol}>
                <p className="text-xs text-[var(--text-secondary)] mb-1.5 font-mono">
                  {c.label}
                </p>
                <TradingViewChart symbol={c.symbol} interval="D" height={340} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 最近委员会决议 —— 快速记账入口 */}
      <RecentVerdicts onRecord={(opts) => setRecordModal(opts)} />

      {/* 对话框 */}
      <CashDialog mode="deposit" open={dialog === "deposit"} onClose={close} />
      <CashDialog mode="withdraw" open={dialog === "withdraw"} onClose={close} />
      <GoldTradeDialog mode="buy" open={dialog === "gold_buy"} onClose={close} />
      <GoldTradeDialog mode="sell" open={dialog === "gold_sell"} onClose={close} />
      <GoldOffsetDialog open={dialog === "gold_offset"} onClose={close} />

      <HoldingDialog
        mode={holdingDialog?.mode ?? "create"}
        open={holdingDialog !== null}
        onClose={() => setHoldingDialog(null)}
        holding={holdingDialog?.mode === "edit" ? holdingDialog.holding : undefined}
      />

      {/* 记账 modal */}
      <RecordModal
        open={recordModal !== null}
        onClose={() => setRecordModal(null)}
        defaultSymbol={recordModal?.defaultSymbol}
        defaultDirection={recordModal?.defaultDirection}
        verdictId={recordModal?.verdictId}
      />
    </div>
  );
}

// ─── 最近委员会决议卡片 ──────────────────────────────────────────────────────

/**
 * RecentVerdicts — 拉取最近 5 条委员会决议，每条旁边有"记一笔"按钮。
 * 方向映射：BUY / ACCUMULATE → BUY；SELL / TRIM → SELL；HOLD → BUY（用户自己调）
 */
function RecentVerdicts({
  onRecord,
}: {
  onRecord: (opts: {
    defaultSymbol?: string;
    defaultDirection?: "BUY" | "SELL";
    verdictId?: string;
  }) => void;
}) {
  const { data, isLoading } = useSWR<CommitteeSessionsResponse>(
    SWR_KEYS.COMMITTEE_SESSIONS_5,
    fetcher,
    { refreshInterval: 120_000 },
  );
  const { enabled: privacyOn } = usePrivacy();

  if (isLoading || !data || data.count === 0) return null;

  /**
   * verdict 映射到方向：
   * BUY / ACCUMULATE → BUY
   * SELL / TRIM → SELL
   * HOLD → 默认 BUY（用户可在 modal 里切换）
   */
  function toDirection(verdict?: string | null): "BUY" | "SELL" {
    if (!verdict) return "BUY";
    if (["SELL", "TRIM"].includes(verdict)) return "SELL";
    return "BUY";
  }

  return (
    <section className="mt-10 border-t border-[var(--border-subtle)] pt-6">
      <header className="flex items-baseline justify-between mb-3">
        <h2 className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">
          最近决议 · 快速记账
        </h2>
        <p className="text-xs text-[var(--text-tertiary)]">
          点"记一笔"写入内部账本，不连真实支付
        </p>
      </header>

      {/* overflow-x-auto：移动端 375px 横向滚动避免表格溢出 */}
      <div className="border border-[var(--border-subtle)] overflow-x-auto">
        <table className="w-full text-sm tabular-nums min-w-[480px]">
          <thead className="bg-[var(--surface-raised)] text-[var(--text-tertiary)] text-xs">
            <tr>
              <th className="px-3 py-2 text-left">日期</th>
              <th className="px-3 py-2 text-left">资产</th>
              <th className="px-3 py-2 text-left">决议</th>
              <th className="px-3 py-2 text-right">置信度</th>
              <th className="px-3 py-2 text-right">建议 ¥</th>
              <th className="px-3 py-2 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {data.sessions.map((s: CommitteeSessionSummary, i: number) => {
              const { action, tone } = verdictAction(s.verdict, s.suggested_alloc_cny, privacyOn);
              const toneClass = {
                pos: "text-pos",
                neg: "text-neg",
                warn: "text-warn",
                neutral: "text-[var(--text-primary)]",
              }[tone];

              return (
                <tr key={i} className="border-t border-[var(--border-subtle)] hover:bg-[var(--surface-raised)]/50">
                  <td className="px-3 py-2 text-[var(--text-tertiary)] font-mono text-xs">
                    {s.date}
                  </td>
                  <td className="px-3 py-2 font-mono text-[var(--text-primary)]">
                    {s.symbol}
                  </td>
                  <td className="px-3 py-2">
                    <VerdictBadge verdict={s.verdict ?? null} />
                  </td>
                  <td className="px-3 py-2 text-right text-[var(--text-secondary)] text-xs font-mono">
                    {s.confidence != null ? `${(s.confidence * 100).toFixed(0)}%` : "—"}
                  </td>
                  <td className={`px-3 py-2 text-right text-xs font-mono ${toneClass}`}>
                    {action}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        onRecord({
                          defaultSymbol: s.symbol,
                          defaultDirection: toDirection(s.verdict),
                          // 后端决议 session 暂无 id 字段，用 date+symbol 拼
                          verdictId: `${s.date}__${s.symbol}`,
                        })
                      }
                    >
                      记一笔
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
