import { useState } from "react";
import useSWR from "swr";
import {
  fetcher,
  type JobsStatusResponse,
  type InsightsResponse,
  type DreamsStateResponse,
  type PnLHistoryResponse,
  type CommitteeSessionsResponse,
  type CommitteeSessionDetail,
  type RegimeResponse,
} from "../lib/api-client";
import { shortTime } from "../lib/format";

/**
 * 系统 / 原理可视化页 — 暴露所有静默 cron 的内部状态
 *
 * 标签页：
 * - Cron Jobs：什么在跑 / 下次几点
 * - Regime：当前市场判定（牛/熊/震荡 + LLM 看的 brief）
 * - Insights：Dreaming 沉淀的长期模式
 * - Dreams：Dreaming 短期记忆 + 候选池 + 最近 events
 * - PnL 历史：原始数据点（jobs/pnl_snapshot 每 2h 写）
 * - 委员会库：所有历史决议（点开看完整 markdown）
 */
type Tab = "jobs" | "regime" | "insights" | "dreams" | "pnl" | "committee";

const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: "jobs", label: "🕐 Cron Jobs", hint: "静默任务时刻表" },
  { id: "regime", label: "📊 市场 Regime", hint: "牛/熊/震荡判定" },
  { id: "insights", label: "💡 长期模式", hint: "Dreaming 沉淀" },
  { id: "dreams", label: "🌙 Dreams", hint: "短期记忆 + 候选池" },
  { id: "pnl", label: "📈 PnL 历史", hint: "原始 2h 快照" },
  { id: "committee", label: "🏛 委员会库", hint: "历史决议 + 命中率" },
];

export default function System() {
  const [tab, setTab] = useState<Tab>("jobs");

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold mb-1">系统 / 原理</h1>
        <p className="text-xs text-zinc-500">
          所有 shell 静默跑的 cron + 决策依据，让你看清"AI 是怎么判断的"
        </p>
      </header>

      <div className="flex flex-wrap gap-1 border-b border-zinc-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-sm border-b-2 -mb-px transition ${
              tab === t.id
                ? "border-gold-500 text-gold-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
            title={t.hint}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === "jobs" && <JobsTab />}
        {tab === "regime" && <RegimeTab />}
        {tab === "insights" && <InsightsTab />}
        {tab === "dreams" && <DreamsTab />}
        {tab === "pnl" && <PnLTab />}
        {tab === "committee" && <CommitteeTab />}
      </div>
    </div>
  );
}

// =================== Cron Jobs ===================

function JobsTab() {
  const { data, error, isLoading } = useSWR<JobsStatusResponse>(
    "/api/jobs/status",
    fetcher,
    { refreshInterval: 60_000 },
  );
  if (isLoading) return <div className="text-zinc-400">加载中...</div>;
  if (error) return <div className="text-red-400">加载失败: {error.message}</div>;
  if (!data) return null;

  return (
    <div className="rounded-lg ring-1 ring-zinc-800 overflow-hidden">
      <table className="w-full text-sm tabular-nums">
        <thead className="bg-zinc-900 text-zinc-400 text-xs">
          <tr>
            <th className="px-3 py-2 text-left">名称</th>
            <th className="px-3 py-2 text-left">职责</th>
            <th className="px-3 py-2 text-left">Cron</th>
            <th className="px-3 py-2 text-left">下次</th>
            <th className="px-3 py-2 text-center">启用</th>
          </tr>
        </thead>
        <tbody>
          {data.jobs.map((j) => (
            <tr key={j.name} className="border-t border-zinc-800 hover:bg-zinc-900/40">
              <td className="px-3 py-2 font-mono text-gold-400">{j.name}</td>
              <td className="px-3 py-2 text-zinc-300">{j.description}</td>
              <td className="px-3 py-2 font-mono text-xs text-zinc-400">{j.schedule}</td>
              <td className="px-3 py-2 text-xs text-zinc-400">
                {j.next_run_time ? shortTime(j.next_run_time) : "—"}
              </td>
              <td className="px-3 py-2 text-center">
                {j.enabled ? (
                  <span className="text-green-400">✓</span>
                ) : (
                  <span className="text-zinc-600">·</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// =================== Regime ===================

function RegimeTab() {
  const [symbol, setSymbol] = useState("NDQ.AX");
  const { data, error, isLoading } = useSWR<RegimeResponse>(
    symbol ? `/api/regime/${encodeURIComponent(symbol)}` : null,
    fetcher,
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-xs text-zinc-500">资产:</label>
        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-sm font-mono"
          placeholder="NDQ.AX / GC=F / AAPL ..."
        />
      </div>
      {isLoading && <div className="text-zinc-400">算 regime 中...</div>}
      {error && <div className="text-red-400">失败: {error.message}</div>}
      {data && (
        <div className="space-y-3">
          <div className="rounded-lg ring-1 ring-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-lg font-bold text-gold-400 uppercase">{data.regime}</span>
              <span className="text-xs text-zinc-500">{data.symbol}</span>
            </div>
            <p className="text-sm text-zinc-300 mb-3">{data.reason}</p>
            <div className="text-xs text-zinc-400">
              <span className="font-semibold">策略提示：</span>
              {data.strategy_hint}
            </div>
          </div>

          <details className="rounded-lg ring-1 ring-zinc-800 bg-zinc-900 p-3">
            <summary className="text-xs text-zinc-400 cursor-pointer">原始 metrics（喂给 quant LLM 的硬约束）</summary>
            <pre className="mt-2 text-xs text-zinc-300 whitespace-pre-wrap break-all max-h-96 overflow-auto">
              {JSON.stringify(data.inputs, null, 2)}
            </pre>
          </details>

          <details className="rounded-lg ring-1 ring-zinc-800 bg-zinc-900 p-3">
            <summary className="text-xs text-zinc-400 cursor-pointer">完整 LLM Brief（quant Round 1/2 必收）</summary>
            <pre className="mt-2 text-xs text-zinc-300 whitespace-pre-wrap">
              {data.brief}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

// =================== Insights ===================

function InsightsTab() {
  const { data, error, isLoading } = useSWR<InsightsResponse>("/api/insights", fetcher);
  if (isLoading) return <div className="text-zinc-400">加载中...</div>;
  if (error) return <div className="text-red-400">失败: {error.message}</div>;
  if (!data) return null;

  if (data.count === 0) {
    return (
      <div className="rounded-lg ring-1 ring-zinc-800 bg-zinc-900 p-6 text-center text-zinc-500">
        <p>暂无长期 insights。</p>
        <p className="text-xs mt-2">
          这些由 <code className="bg-zinc-950 px-1 rounded">jobs/dreaming</code>{" "}
          每天凌晨 3 点跑（当前 disabled）整合短期记忆生成。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.items.map((it) => (
        <details key={it.slug} className="rounded-lg ring-1 ring-zinc-800 bg-zinc-900 p-4" open>
          <summary className="cursor-pointer">
            <span className="font-semibold text-gold-400">{it.slug}</span>
            <span className="ml-2 text-xs text-zinc-500">
              confidence {String((it.metadata as Record<string, unknown>).confidence ?? "?")} ·
              count {String((it.metadata as Record<string, unknown>).count ?? "?")}
            </span>
          </summary>
          <pre className="mt-3 text-xs text-zinc-300 whitespace-pre-wrap">{it.body}</pre>
        </details>
      ))}
    </div>
  );
}

// =================== Dreams ===================

function DreamsTab() {
  const { data, error, isLoading } = useSWR<DreamsStateResponse>(
    "/api/dreams/state?event_limit=30",
    fetcher,
  );
  if (isLoading) return <div className="text-zinc-400">加载中...</div>;
  if (error) return <div className="text-red-400">失败: {error.message}</div>;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <section>
        <h3 className="text-sm font-semibold text-zinc-300 mb-2">📋 最近 events（按时间倒序）</h3>
        <div className="rounded-lg ring-1 ring-zinc-800 bg-zinc-900 max-h-96 overflow-auto">
          <table className="w-full text-xs tabular-nums">
            <thead className="bg-zinc-950 text-zinc-500 sticky top-0">
              <tr>
                <th className="px-2 py-1.5 text-left">时间</th>
                <th className="px-2 py-1.5 text-left">阶段</th>
                <th className="px-2 py-1.5 text-left">资产</th>
                <th className="px-2 py-1.5 text-left">verdict</th>
                <th className="px-2 py-1.5 text-right">conf</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_events.map((e, i) => (
                <tr key={i} className="border-t border-zinc-800">
                  <td className="px-2 py-1 text-zinc-500">{shortTime(e.ts)}</td>
                  <td className="px-2 py-1 text-zinc-300 font-mono">{e.phase}</td>
                  <td className="px-2 py-1 text-zinc-400">{(e as { asset?: string }).asset ?? "—"}</td>
                  <td className="px-2 py-1">
                    {(e as { verdict?: string }).verdict ?? "—"}
                  </td>
                  <td className="px-2 py-1 text-right">
                    {(e as { confidence?: number }).confidence ?? ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {data.short_term && (
        <details className="rounded-lg ring-1 ring-zinc-800 bg-zinc-900 p-3">
          <summary className="text-xs text-zinc-400 cursor-pointer">短期记忆 (short-term-recall.json)</summary>
          <pre className="mt-2 text-xs text-zinc-300 whitespace-pre-wrap max-h-72 overflow-auto">
            {JSON.stringify(data.short_term, null, 2)}
          </pre>
        </details>
      )}

      {data.candidates && (
        <details className="rounded-lg ring-1 ring-zinc-800 bg-zinc-900 p-3">
          <summary className="text-xs text-zinc-400 cursor-pointer">候选池 (candidates.json)</summary>
          <pre className="mt-2 text-xs text-zinc-300 whitespace-pre-wrap max-h-72 overflow-auto">
            {JSON.stringify(data.candidates, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

// =================== PnL History ===================

function PnLTab() {
  const { data, error, isLoading } = useSWR<PnLHistoryResponse>(
    "/api/pnl_history?since=200",
    fetcher,
  );
  if (isLoading) return <div className="text-zinc-400">加载中...</div>;
  if (error) return <div className="text-red-400">失败: {error.message}</div>;
  if (!data) return null;

  // 简单倒序展示，配合数字图标颜色
  const points = [...data.points].reverse(); // 最新在前

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">
        共 {data.count} 条快照（jobs/pnl_snapshot 工作日每 2h 写一条；含基准对比的 SVG 见主面板）
      </p>
      <div className="rounded-lg ring-1 ring-zinc-800 overflow-hidden">
        <table className="w-full text-xs tabular-nums">
          <thead className="bg-zinc-900 text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left">时间</th>
              <th className="px-3 py-2 text-right">总浮盈 %</th>
              <th className="px-3 py-2 text-right">NDQ %</th>
              <th className="px-3 py-2 text-right">Gold %</th>
            </tr>
          </thead>
          <tbody>
            {points.slice(0, 80).map((p, i) => {
              const total = p.total_pnl_pct ?? 0;
              const ndq = (p as { ndq_pnl_pct?: number }).ndq_pnl_pct;
              const gold = (p as { gold_pnl_pct?: number }).gold_pnl_pct;
              return (
                <tr key={i} className="border-t border-zinc-800">
                  <td className="px-3 py-1 text-zinc-500">{shortTime(p.ts)}</td>
                  <td className={`px-3 py-1 text-right ${total >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {total >= 0 ? "+" : ""}{total.toFixed(2)}
                  </td>
                  <td className="px-3 py-1 text-right text-zinc-400">
                    {ndq != null ? `${ndq >= 0 ? "+" : ""}${ndq.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-3 py-1 text-right text-zinc-400">
                    {gold != null ? `${gold >= 0 ? "+" : ""}${gold.toFixed(2)}` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =================== Committee Sessions ===================

function CommitteeTab() {
  const { data, error, isLoading } = useSWR<CommitteeSessionsResponse>(
    "/api/committee_sessions?limit=100",
    fetcher,
  );
  const [selected, setSelected] = useState<{ date: string; symbol: string } | null>(null);

  if (isLoading) return <div className="text-zinc-400">加载中...</div>;
  if (error) return <div className="text-red-400">失败: {error.message}</div>;
  if (!data) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div>
        <p className="text-xs text-zinc-500 mb-2">共 {data.count} 个历史决议（点击看完整 memo）</p>
        <div className="rounded-lg ring-1 ring-zinc-800 overflow-hidden max-h-[70vh] overflow-y-auto">
          <table className="w-full text-xs tabular-nums">
            <thead className="bg-zinc-900 text-zinc-500 sticky top-0">
              <tr>
                <th className="px-2 py-1.5 text-left">日期</th>
                <th className="px-2 py-1.5 text-left">资产</th>
                <th className="px-2 py-1.5 text-left">verdict</th>
                <th className="px-2 py-1.5 text-right">conf</th>
                <th className="px-2 py-1.5 text-right">建议 ¥</th>
              </tr>
            </thead>
            <tbody>
              {data.sessions.map((s, i) => {
                const isActive =
                  selected?.date === s.date && selected?.symbol === s.symbol;
                return (
                  <tr
                    key={i}
                    onClick={() => setSelected({ date: s.date, symbol: s.symbol })}
                    className={`border-t border-zinc-800 cursor-pointer hover:bg-zinc-900/60 ${
                      isActive ? "bg-zinc-800/60" : ""
                    }`}
                  >
                    <td className="px-2 py-1 text-zinc-400">{s.date}</td>
                    <td className="px-2 py-1 font-mono text-gold-400">{s.symbol}</td>
                    <td className="px-2 py-1">
                      <VerdictBadge verdict={s.verdict ?? null} />
                    </td>
                    <td className="px-2 py-1 text-right text-zinc-400">{s.confidence ?? "—"}</td>
                    <td
                      className={`px-2 py-1 text-right ${
                        s.suggested_alloc_cny == null
                          ? "text-zinc-500"
                          : s.suggested_alloc_cny > 0
                            ? "text-green-400"
                            : s.suggested_alloc_cny < 0
                              ? "text-red-400"
                              : "text-zinc-300"
                      }`}
                    >
                      {s.suggested_alloc_cny != null
                        ? (s.suggested_alloc_cny > 0 ? "+" : "") +
                          s.suggested_alloc_cny.toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        {selected ? (
          <CommitteeDetail date={selected.date} symbol={selected.symbol} />
        ) : (
          <div className="rounded-lg ring-1 ring-zinc-800 bg-zinc-900 p-6 text-center text-zinc-500">
            点击左侧任意决议看完整 markdown
          </div>
        )}
      </div>
    </div>
  );
}

function CommitteeDetail({ date, symbol }: { date: string; symbol: string }) {
  const { data } = useSWR<CommitteeSessionDetail>(
    `/api/committee_sessions/${encodeURIComponent(date)}/${encodeURIComponent(symbol)}`,
    fetcher,
  );
  if (!data) return <div className="text-zinc-500">加载...</div>;
  return (
    <div className="rounded-lg ring-1 ring-zinc-800 bg-zinc-900 p-4 max-h-[70vh] overflow-y-auto">
      <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-mono">{data.content}</pre>
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict: string | null }) {
  if (!verdict) return <span className="text-zinc-500">—</span>;
  const colors: Record<string, string> = {
    BUY: "bg-green-500/20 text-green-300 ring-green-500/30",
    ACCUMULATE: "bg-green-500/20 text-green-300 ring-green-500/30",
    HOLD: "bg-zinc-700/40 text-zinc-300 ring-zinc-600",
    TRIM: "bg-orange-500/20 text-orange-300 ring-orange-500/30",
    SELL: "bg-red-500/20 text-red-300 ring-red-500/30",
  };
  const cls = colors[verdict] ?? "bg-zinc-700/40 text-zinc-300 ring-zinc-600";
  return <span className={`rounded px-1.5 py-0.5 text-xs ring-1 ${cls}`}>{verdict}</span>;
}
