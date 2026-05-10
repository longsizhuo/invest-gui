import { useState } from "react";
import { SWR_KEYS } from "../lib/swr-keys";

/**
 * PublicStats — 脱敏聚合命中率页
 *
 * 路由：/public/stats
 *
 * 安全约束：
 * - 绝对不展示 symbol / threshold / 持仓字段
 * - 如果后端返回数据含敏感字段名，直接报错提示"后端脱敏管道未生效"
 * - **小样本保护**：单个方向 sample_size < MIN_SAMPLE_FOR_DISPLAY 时不显示命中率数字
 *   （金融视角：n=3 的"100%"或"0%"是统计噪音，对外展示会误导）
 *
 * 数据来源：GET /api/stats/public
 *
 * 展示内容：
 * - 顶部固定免责（不可折叠）
 * - 三个 tab（30d / 90d / all）
 * - 大数字"命中率 X%"，旁边带 n=XX，n < 30 显示"样本不足"
 */

/** 金融视角强约束：小样本不展示命中率数字 */
const MIN_SAMPLE_FOR_DISPLAY = 30;

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

/** 单个时间窗口的聚合统计 */
interface WindowStats {
  /** 总命中率 0-1 */
  hit_rate: number;
  /** 样本量 */
  sample_size: number;
  /** bullish（BUY/ACCUMULATE）命中率 */
  bullish_hit_rate: number | null;
  /** bearish（SELL/TRIM）命中率 */
  bearish_hit_rate: number | null;
  /** hold 命中率 */
  hold_hit_rate: number | null;
  /** bullish 样本量 */
  bullish_n: number | null;
  /** bearish 样本量 */
  bearish_n: number | null;
  /** hold 样本量 */
  hold_n: number | null;
}

/** /api/stats/public 返回结构 */
interface PublicStatsResponse {
  /** 30 天窗口 */
  "30d": WindowStats;
  /** 90 天窗口 */
  "90d": WindowStats;
  /** 全量 */
  all: WindowStats;
  /** 生成时间 ISO8601 */
  generated_at: string;
}

/** 敏感字段黑名单：后端脱敏管道必须过滤掉这些字段 */
const SENSITIVE_FIELD_NAMES = [
  "symbol", "threshold", "holdings", "position", "alloc_cny",
  "cost", "ticker", "security", "asset",
];

/**
 * 校验响应数据不含敏感字段名（递归检查所有 key）
 * 如果发现敏感字段，抛出错误让 UI 显示安全警告
 */
function assertNoSensitiveFields(data: unknown, path = ""): void {
  if (data == null || typeof data !== "object") return;
  for (const key of Object.keys(data as object)) {
    const fullPath = path ? `${path}.${key}` : key;
    if (SENSITIVE_FIELD_NAMES.some((s) => key.toLowerCase().includes(s))) {
      throw new Error(
        `后端脱敏管道未生效：响应字段 "${fullPath}" 含敏感信息，已阻止渲染。` +
        `请检查 /api/stats/public 是否正确过滤了 symbol / threshold / 持仓字段。`,
      );
    }
    assertNoSensitiveFields((data as Record<string, unknown>)[key], fullPath);
  }
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────

type WindowKey = "30d" | "90d" | "all";
const WINDOWS: { id: WindowKey; label: string }[] = [
  { id: "30d", label: "近 30 天" },
  { id: "90d", label: "近 90 天" },
  { id: "all", label: "全量" },
];

export default function PublicStats() {
  const [activeWindow, setActiveWindow] = useState<WindowKey>("30d");
  const [data, setData] = useState<PublicStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 首次渲染时拉数据（避免 useSWR 的依赖，这个页面不需要 polling）
  const [fetched, setFetched] = useState(false);
  if (!fetched) {
    setFetched(true);
    // 异步拉取，不阻塞渲染
    fetch(SWR_KEYS.STATS_PUBLIC, { credentials: "same-origin" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return res.json();
      })
      .then((json: unknown) => {
        // 安全校验：如果含敏感字段直接报错
        assertNoSensitiveFields(json);
        setData(json as PublicStatsResponse);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <header>
        <h1 className="font-display text-3xl text-[var(--text-primary)] mb-1">
          命中率统计
        </h1>
        <p className="text-xs text-[var(--text-tertiary)]">
          openInvest 委员会历史方向性命中率 · 脱敏聚合数据 · 不含持仓 / symbol 细节
        </p>
      </header>

      {/* 固定免责（金融视角红线：不可折叠、不可隐藏，置于命中率数字之前） */}
      <div className="border border-[var(--border-strong)] bg-[var(--surface-base)] p-3 text-xs text-[var(--text-secondary)] leading-relaxed">
        <p>
          ⚠️ 本页数据仅反映**当前部署用户**的历史使用记录，**不构成任何投资建议**，
          亦不代表 fork 用户将获得同等结果。**过去表现不预示未来收益**。
          统计样本不足时不显示数字（n &lt; {MIN_SAMPLE_FOR_DISPLAY}）。
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-[var(--text-secondary)] py-10">
          <div className="w-6 h-6 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
          <span className="text-sm">加载中...</span>
        </div>
      )}

      {error && (
        <div className="border border-[var(--neg)] bg-[var(--surface-raised)] p-5 space-y-2">
          <p className="text-sm font-semibold text-neg">数据加载失败</p>
          <p className="text-xs text-[var(--text-secondary)] font-mono break-all">{error}</p>
          <p className="text-xs text-[var(--text-tertiary)]">
            后端端点 <code className="bg-[var(--surface-base)] px-1">/api/stats/public</code> 可能尚未实现（dev-core Sprint 2 任务），
            或脱敏校验拦截了响应。
          </p>
        </div>
      )}

      {data && !error && (
        <>
          {/* 时间窗口 tab */}
          <div className="flex gap-1 border-b border-[var(--border-subtle)]">
            {WINDOWS.map((w) => (
              <button
                key={w.id}
                onClick={() => setActiveWindow(w.id)}
                className={
                  "px-4 py-2 text-sm border-b-2 -mb-px transition-colors duration-100 " +
                  (activeWindow === w.id
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]")
                }
              >
                {w.label}
              </button>
            ))}
          </div>

          <WindowPanel stats={data[activeWindow]} />

          {data.generated_at && (
            <p className="text-xs text-[var(--text-tertiary)] text-right font-mono">
              数据更新于 {data.generated_at}
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ─── 单个时间窗口展示面板 ─────────────────────────────────────────────────────

function WindowPanel({ stats }: { stats: WindowStats }) {
  // 金融视角小样本保护：n < MIN_SAMPLE_FOR_DISPLAY 时不显示具体数字
  const enoughSamples = stats.sample_size >= MIN_SAMPLE_FOR_DISPLAY;
  const hitPct = (stats.hit_rate * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* 主命中率大数字（小样本时降级为"样本不足"提示） */}
      <div className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-8 text-center">
        <p className="text-xs uppercase tracking-widest text-[var(--text-tertiary)] mb-2">
          整体命中率
        </p>
        {enoughSamples ? (
          <>
            <p className="font-display text-6xl font-bold text-[var(--accent)] tabular-nums">
              {hitPct}%
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mt-3 font-mono">
              样本量 n={stats.sample_size}（含 HOLD；剔除 HOLD 见下方分类）
            </p>
          </>
        ) : (
          <>
            <p className="font-display text-2xl text-[var(--text-tertiary)]">
              样本不足
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mt-3 font-mono">
              n={stats.sample_size}（需 ≥ {MIN_SAMPLE_FOR_DISPLAY} 才能展示统计显著的命中率）
            </p>
          </>
        )}
      </div>

      {/* bullish / bearish / hold 三张小卡 */}
      <div className="grid gap-3 md:grid-cols-3">
        <DirectionCard
          label="看多（BUY / ACCUMULATE）"
          hitRate={stats.bullish_hit_rate}
          n={stats.bullish_n}
          color="pos"
        />
        <DirectionCard
          label="看空（SELL / TRIM）"
          hitRate={stats.bearish_hit_rate}
          n={stats.bearish_n}
          color="neg"
        />
        <DirectionCard
          label="观望（HOLD）"
          hitRate={stats.hold_hit_rate}
          n={stats.hold_n}
          color="neutral"
        />
      </div>

      {/* 诚实解读说明 */}
      <div className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4 text-xs text-[var(--text-secondary)] space-y-1">
        <p className="font-semibold text-[var(--text-primary)]">如何解读</p>
        <p>整体命中率含 HOLD；HOLD 样本量较大会推高整体数字（HOLD 的"对"定义是市场没有大幅波动）。</p>
        <p>真实方向性判断力请看"看多"和"看空"两栏（剔除 HOLD 的命中率）。</p>
        <p className="text-[var(--text-tertiary)]">本页不含 symbol / 持仓细节，仅聚合统计。</p>
      </div>
    </div>
  );
}

/** 单个方向的命中率小卡 */
function DirectionCard({
  label,
  hitRate,
  n,
  color,
}: {
  label: string;
  hitRate: number | null;
  n: number | null;
  color: "pos" | "neg" | "neutral";
}) {
  const colorClass =
    color === "pos"
      ? "text-pos"
      : color === "neg"
        ? "text-neg"
        : "text-[var(--text-primary)]";

  // 金融视角小样本保护：n < MIN_SAMPLE_FOR_DISPLAY 时降级为"样本不足"
  const enoughSamples = (n ?? 0) >= MIN_SAMPLE_FOR_DISPLAY;

  return (
    <div className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4">
      <p className="text-xs text-[var(--text-tertiary)] mb-2">{label}</p>
      {enoughSamples && hitRate != null ? (
        <>
          <p className={`text-2xl font-bold tabular-nums ${colorClass}`}>
            {(hitRate * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1 font-mono">
            n={n}
          </p>
          <div className="mt-2 h-1.5 bg-[var(--surface-base)] overflow-hidden">
            <div
              className={`h-full transition-all ${color === "pos" ? "bg-[var(--pos)]" : color === "neg" ? "bg-[var(--neg)]" : "bg-[var(--accent)]"}`}
              style={{ width: `${Math.min(100, hitRate * 100)}%` }}
            />
          </div>
        </>
      ) : (
        <>
          <p className="text-base text-[var(--text-tertiary)]">样本不足</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1 font-mono">
            n={n ?? 0}（需 ≥ {MIN_SAMPLE_FOR_DISPLAY}）
          </p>
        </>
      )}
    </div>
  );
}
