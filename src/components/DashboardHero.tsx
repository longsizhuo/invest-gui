import useSWR from "swr";
import { Link } from "react-router-dom";
import { fetcher } from "../lib/api-client";

/**
 * Dashboard Hero landmark
 *
 * 用户每次进来想第一眼看到的两个事实：
 *   1. 总资产折 CNY 是多少（最大 display serif 排版）
 *   2. 上次委员会跑了什么、何时跑的（次要灰阶）
 *
 * 排版策略：
 * - 总资产用 font-display + 5xl/6xl + tracking 收紧 = 编辑感
 * - 数字用 font-mono：避免 serif 数字宽度抖动
 * - 拉不到汇率的币种降级显示 "—"，保持容器尺寸稳定
 *
 * 未拉到 /api/portfolio/total_value 时降级显示空骨架，不阻塞主面板渲染
 */

// 后端 schema：connectors/web_api.py:TotalValueResponse
// 类型应由 openapi-typescript 自动生成；session 里手动声明，下次 gen-types 会覆盖
type TotalValueResp = {
  base_currency: string;
  cash_total: number;
  holdings_total: number;
  grand_total: number;
  fx_rates: Record<string, number | null>;
};

// 后端 schema：CommitteeSessionsResponse
type CommitteeSessionsResp = {
  count: number;
  sessions: Array<{
    date: string;
    symbol: string;
    verdict?: string | null;
    confidence?: number | null;
    dominant_view?: string | null;
  }>;
};

function formatCNY(n: number): string {
  return n.toLocaleString("zh-CN", { maximumFractionDigits: 0 });
}

export function DashboardHero() {
  const { data: total, error } = useSWR<TotalValueResp>(
    "/api/portfolio/total_value?base=CNY",
    fetcher,
    { refreshInterval: 60_000 },
  );

  const ready = total != null;
  // 拉不到 → 全部 dash（不要用 0 假装"零资产"，会误导）
  const renderAmount = (n: number | undefined) =>
    ready && n != null ? `¥${formatCNY(n)}` : "¥—";

  return (
    <section
      className={
        "border-b border-[var(--border-strong)] " +
        "pb-10 mb-6"
      }
    >
      <div className="grid gap-8 md:grid-cols-12">
        {/* 左 7 栏：总资产大数 + 拆分 */}
        <div className="md:col-span-7">
          <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-widest mb-3">
            总资产 · 折 CNY
          </p>
          <p
            className={
              "font-display font-semibold text-5xl md:text-6xl " +
              "leading-none tracking-display-tight " +
              "tabular-nums " +
              (ready ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]")
            }
          >
            {renderAmount(total?.grand_total)}
          </p>

          {error && (
            <p className="text-xs text-neg mt-3 font-mono">
              拉取失败：{error.message ?? "endpoint 可能未上线"}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-baseline gap-x-8 gap-y-2 text-sm font-mono tabular-nums">
            <div>
              <span className="text-[var(--text-tertiary)] text-xs mr-2">现金</span>
              <span className="text-[var(--text-secondary)]">
                {renderAmount(total?.cash_total)}
              </span>
            </div>
            <div>
              <span className="text-[var(--text-tertiary)] text-xs mr-2">持仓</span>
              <span className="text-[var(--text-secondary)]">
                {renderAmount(total?.holdings_total)}
              </span>
            </div>
            {total?.fx_rates && (
              <div className="text-[var(--text-tertiary)] text-xs">
                {Object.entries(total.fx_rates)
                  .filter(([k]) => k !== "CNY")
                  .map(([k, v]) =>
                    v != null ? `${k}=${v.toFixed(2)}` : `${k}=—`,
                  )
                  .join("  ·  ")}
              </div>
            )}
          </div>
        </div>

        {/* 右 5 栏：上次委员会摘要 */}
        <div className="md:col-span-5 md:border-l md:border-[var(--border-subtle)] md:pl-8">
          <CommitteeMini />
        </div>
      </div>
    </section>
  );
}

function CommitteeMini() {
  const { data } = useSWR<CommitteeSessionsResp>(
    "/api/committee_sessions?limit=1",
    fetcher,
    { refreshInterval: 120_000 },
  );

  const latest = data?.sessions?.[0];

  if (!latest) {
    return (
      <div>
        <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-widest mb-3">
          上次委员会
        </p>
        <p className="text-sm text-[var(--text-tertiary)]">尚无记录</p>
        <Link
          to="/committee"
          className={
            "inline-flex items-center gap-1 text-xs mt-3 " +
            "text-[var(--text-primary)] " +
            "border-b border-[var(--text-primary)] pb-0.5"
          }
        >
          触发首次委员会 →
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-widest mb-3">
        上次委员会
      </p>
      <p className="font-display text-2xl text-[var(--text-primary)] mb-1 italic">
        {latest.verdict ?? "—"}
      </p>
      <p className="text-xs text-[var(--text-tertiary)] font-mono">
        {latest.symbol} · {latest.date}
        {latest.confidence != null &&
          ` · 置信 ${(latest.confidence * 100).toFixed(0)}%`}
      </p>
      <Link
        to="/committee"
        className={
          "inline-flex items-center gap-1 text-xs mt-4 " +
          "text-[var(--text-primary)] " +
          "border-b border-[var(--border-strong)] hover:border-[var(--text-primary)] pb-0.5 " +
          "transition-colors duration-100"
        }
      >
        查看完整记录 →
      </Link>
    </div>
  );
}
