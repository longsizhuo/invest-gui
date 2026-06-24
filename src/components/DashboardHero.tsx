import useSWR from "swr";
import { Link } from "react-router-dom";
import { fetcher } from "../lib/api-client";
import { SWR_KEYS } from "../lib/swr-keys";
import { usePrivacy } from "../lib/privacy";
import { verdictAction } from "../lib/format";

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
    suggested_alloc_cny?: number | null;
  }>;
};


function formatCNY(n: number): string {
  return n.toLocaleString("zh-CN", { maximumFractionDigits: 0 });
}

/** 后端 schema：connectors/web_api.py:UserProfileResponse */
type UserProfile = {
  display_name?: string | null;
  risk_tolerance?: string | null;
  wealth_context?: {
    emergency_buffer_cny?: number | null;
    family_backup_available?: boolean | null;
    account_purpose?: string | null;
  } | null;
};

/**
 * wealth_context 摘要 chips —— 让用户看到"agent 在用什么上下文做决策"
 *
 * 没填 wealth_context 时不展示（不要让用户看到空 chip 困惑）。填了之后展示
 * 应急金额度 + 账户性质，配 Link 到 /settings 让用户改。
 *
 * 透明度价值：用户看到"agent 知道我有 ¥4M backup"，就明白为什么 Risk Officer
 * 不会因为低 portfolio cash 喊清仓。
 */
function WealthContextChips() {
  const { data } = useSWR<UserProfile>(SWR_KEYS.USER, fetcher);
  const { enabled: privacyOn } = usePrivacy();
  const ctx = data?.wealth_context;
  if (!ctx) return null;

  const buf = ctx.emergency_buffer_cny;
  const purpose = ctx.account_purpose;
  if (buf == null && !purpose && ctx.family_backup_available == null) return null;

  const fmtBuf = (n: number) => {
    if (privacyOn) return "¥●●●";
    if (n >= 1_000_000) return `¥${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
    if (n >= 10_000) return `¥${(n / 10_000).toFixed(0)}万`;
    return `¥${n.toLocaleString("zh-CN", { maximumFractionDigits: 0 })}`;
  };

  return (
    <Link
      to="/settings"
      className="mt-4 flex flex-wrap items-center gap-2 text-xs hover:opacity-80 transition-opacity"
      title="点击修改 off-portfolio 财务背景"
    >
      {buf != null && buf > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-1 border border-[var(--border-strong)] bg-[var(--surface-base)]">
          <span aria-hidden>💰</span>
          <span className="text-[var(--text-tertiary)]">应急金</span>
          <span className="text-[var(--text-secondary)] font-mono tabular-nums">
            {fmtBuf(buf)}
          </span>
        </span>
      )}
      {purpose && (
        <span className="inline-flex items-center gap-1 px-2 py-1 border border-[var(--border-strong)] bg-[var(--surface-base)]">
          <span aria-hidden>🏷</span>
          <span className="text-[var(--text-secondary)]">{purpose}</span>
        </span>
      )}
      {ctx.family_backup_available === true && (
        <span className="inline-flex items-center gap-1 px-2 py-1 border border-[var(--border-strong)] bg-[var(--surface-base)]">
          <span aria-hidden>🏠</span>
          <span className="text-[var(--text-secondary)]">家族支持</span>
        </span>
      )}
    </Link>
  );
}

export function DashboardHero() {
  const { data: total, error } = useSWR<TotalValueResp>(
    SWR_KEYS.PORTFOLIO_TOTAL_VALUE,
    fetcher,
    { refreshInterval: 60_000 },
  );
  const { enabled: privacyOn } = usePrivacy();

  const ready = total != null;
  // 拉不到 → 全部 dash（不要用 0 假装"零资产"，会误导）
  // 隐私模式下绝对金额脱敏成 ●●●（保留 ¥ 前缀让用户知道这是金额）
  const renderAmount = (n: number | undefined) => {
    if (!ready || n == null) return "¥—";
    if (privacyOn) return "¥●●●●●";
    return `¥${formatCNY(n)}`;
  };

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
            <div className="text-xs text-[var(--text-secondary)] mt-3 border border-[var(--border-subtle)] px-3 py-2 inline-block">
              <span className="text-neg font-mono">无法连接 API</span>
              <span className="ml-2">
                ——{" "}
                <a
                  href="https://github.com/longsizhuo/openInvest/blob/main/docs/QUICK_START.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-[var(--text-primary)]"
                >
                  部署文档
                </a>
                ；本地 dev：<code className="bg-[var(--surface-base)] px-1 mx-0.5">uv run uvicorn connectors.web_api:app --port 8765</code>
              </span>
            </div>
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
            {/* 纯 CNY 组合（filter 后无外币）不渲染该块，避免空卡 */}
            {Object.entries(total?.fx_rates ?? {}).some(([k]) => k !== "CNY") && (
              <div className="text-[var(--text-tertiary)] text-xs">
                {Object.entries(total?.fx_rates ?? {})
                  .filter(([k]) => k !== "CNY")
                  .map(([k, v]) => (v != null ? `${k}=${v.toFixed(2)}` : `${k}=—`))
                  .join("  ·  ")}
              </div>
            )}
          </div>

          {/* wealth_context 摘要 chips —— 让用户看到 agent 在用什么上下文做决策 */}
          <WealthContextChips />
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
    SWR_KEYS.COMMITTEE_SESSIONS_LATEST,
    fetcher,
    { refreshInterval: 120_000 },
  );
  const { enabled: privacyOn } = usePrivacy();

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

  // F5: verdict 翻成中文动作行（Tester 一票否决：TRIM 没解释看不懂）
  const { action, tone } = verdictAction(
    latest.verdict,
    latest.suggested_alloc_cny,
    privacyOn,
  );
  const toneClass = {
    pos: "text-pos",
    neg: "text-neg",
    warn: "text-warn",
    neutral: "text-[var(--text-primary)]",
  }[tone];

  return (
    <div>
      <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-widest mb-3">
        AI 今日建议
      </p>
      {/* 第一行：中文动作 + 金额，明显高亮 */}
      <p className={`font-display text-2xl mb-1 ${toneClass}`}>{action}</p>
      {/* 第二行：原始 verdict (TRIM 等) + 资产 + 日期 + 置信度 */}
      <p className="text-xs text-[var(--text-tertiary)] font-mono">
        {latest.verdict ?? "—"} · {latest.symbol} · {latest.date}
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
