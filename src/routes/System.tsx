import { useState } from "react";
import useSWR from "swr";
import {
  fetcher,
  type JobsStatusResponse,
  type InsightsResponse,
  type DreamsStateResponse,
  type PnLHistoryResponse,
  type RegimeResponse,
} from "../lib/api-client";
import { shortTime, labelPhase } from "../lib/format";
import { SWR_KEYS } from "../lib/swr-keys";
import { DataSourcesTab } from "./system/DataSourcesTab";
import { CostTab } from "./system/CostTab";

/**
 * 系统页 —— 内部状态 + 数据源
 *
 * 委员会相关（决议历史 / 4 角色 prompt / 命中率）已并入 /committee。
 * 这里只剩"系统在跑什么 + 数据从哪来"两类内部信息：
 * - Cron jobs：静默任务时刻表
 * - Regime：当前市场判定（喂给 quant LLM 的硬约束）
 * - Insights：Dreaming 沉淀的长期模式
 * - Dreams：Dreaming 短期记忆 + 候选池
 * - PnL 历史：原始 2h 快照点
 * - 数据源：yfinance / DB / commsec 健康度
 */
type Tab = "jobs" | "regime" | "insights" | "dreams" | "pnl" | "data" | "cost";

const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: "jobs", label: "Cron Jobs", hint: "静默任务时刻表" },
  { id: "regime", label: "市场 Regime", hint: "牛/熊/震荡判定" },
  { id: "data", label: "数据源", hint: "yfinance / DB / 邮件 健康度" },
  { id: "pnl", label: "PnL 历史", hint: "原始 2h 快照" },
  { id: "insights", label: "长期模式", hint: "Dreaming 沉淀" },
  { id: "dreams", label: "Dreams", hint: "短期记忆 + 候选池" },
  { id: "cost", label: "成本", hint: "本月 LLM token / 成本 / 调用次数" },
];

export default function System() {
  const [tab, setTab] = useState<Tab>("jobs");

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold mb-1">系统 / 原理</h1>
        <p className="text-xs text-[var(--text-tertiary)]">
          所有 shell 静默跑的 cron + 决策依据，让你看清"AI 是怎么判断的"
        </p>
      </header>

      {/* flex-wrap + 移动端小字：tabs 数量多时自然换行，不横向溢出 */}
      <div className="flex flex-wrap gap-1 border-b border-[var(--border-subtle)]">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-2 sm:px-3 py-2 text-xs sm:text-sm border-b-2 -mb-px transition ${
              tab === t.id
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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
        {tab === "data" && <DataSourcesTab />}
        {tab === "pnl" && <PnLTab />}
        {tab === "insights" && <InsightsTab />}
        {tab === "dreams" && <DreamsTab />}
        {tab === "cost" && <CostTab />}
      </div>
    </div>
  );
}

// =================== Cron Jobs ===================

function JobsTab() {
  const { data, error, isLoading } = useSWR<JobsStatusResponse>(
    SWR_KEYS.JOBS_STATUS,
    fetcher,
    { refreshInterval: 60_000 },
  );
  if (isLoading) return <div className="text-[var(--text-secondary)]">加载中...</div>;
  if (error) return <div className="text-neg">加载失败: {error.message}</div>;
  if (!data) return null;

  return (
    <div className="border border-[var(--border-subtle)] overflow-hidden">
      <table className="w-full text-sm tabular-nums">
        <thead className="bg-[var(--surface-raised)] text-[var(--text-secondary)] text-xs">
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
            <tr key={j.name} className="border-t border-[var(--border-subtle)] hover:bg-[var(--surface-raised)]/40">
              <td className="px-3 py-2 font-mono text-[var(--accent)]">{j.name}</td>
              <td className="px-3 py-2 text-[var(--text-primary)]">{j.description}</td>
              <td className="px-3 py-2 font-mono text-xs text-[var(--text-secondary)]">{j.schedule}</td>
              <td className="px-3 py-2 text-xs text-[var(--text-secondary)]">
                {j.next_run_time ? shortTime(j.next_run_time) : "—"}
              </td>
              <td className="px-3 py-2 text-center">
                {j.enabled ? (
                  <span className="text-pos">✓</span>
                ) : (
                  <span className="text-[var(--text-tertiary)]">·</span>
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
        <label className="text-xs text-[var(--text-tertiary)]">资产:</label>
        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="bg-[var(--surface-base)] border border-[var(--border-strong)] rounded px-2 py-1 text-sm font-mono"
          placeholder="NDQ.AX / GC=F / AAPL ..."
        />
      </div>
      {isLoading && <div className="text-[var(--text-secondary)]">算 regime 中...</div>}
      {error && <div className="text-neg">失败: {error.message}</div>}
      {data && (
        <div className="space-y-3">
          <div className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4">
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-lg font-bold text-[var(--accent)] uppercase">{data.regime}</span>
              <span className="text-xs text-[var(--text-tertiary)]">{data.symbol}</span>
            </div>
            <p className="text-sm text-[var(--text-primary)] mb-3">{data.reason}</p>
            <div className="text-xs text-[var(--text-secondary)]">
              <span className="font-semibold">策略提示：</span>
              {data.strategy_hint}
            </div>
          </div>

          <details className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3">
            <summary className="text-xs text-[var(--text-secondary)] cursor-pointer">原始 metrics（喂给 quant LLM 的硬约束）</summary>
            <pre className="mt-2 text-xs text-[var(--text-primary)] whitespace-pre-wrap break-all max-h-96 overflow-auto">
              {JSON.stringify(data.inputs, null, 2)}
            </pre>
          </details>

          <details className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3">
            <summary className="text-xs text-[var(--text-secondary)] cursor-pointer">完整 LLM Brief（quant Round 1/2 必收）</summary>
            <pre className="mt-2 text-xs text-[var(--text-primary)] whitespace-pre-wrap">
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
  const { data, error, isLoading } = useSWR<InsightsResponse>(SWR_KEYS.INSIGHTS, fetcher);
  if (isLoading) return <div className="text-[var(--text-secondary)]">加载中...</div>;
  if (error) return <div className="text-neg">失败: {error.message}</div>;
  if (!data) return null;

  if (data.count === 0) {
    return (
      <div className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6 text-center text-[var(--text-tertiary)]">
        <p>暂无长期 insights。</p>
        <p className="text-xs mt-2">
          这些由 <code className="bg-[var(--surface-base)] px-1 rounded">jobs/dreaming</code>{" "}
          每天凌晨 3 点跑（当前 disabled）整合短期记忆生成。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.items.map((it) => (
        <details key={it.slug} className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4" open>
          <summary className="cursor-pointer">
            <span className="font-semibold text-[var(--accent)]">{it.slug}</span>
            <span className="ml-2 text-xs text-[var(--text-tertiary)]">
              confidence {String((it.metadata as Record<string, unknown>).confidence ?? "?")} ·
              count {String((it.metadata as Record<string, unknown>).count ?? "?")}
            </span>
          </summary>
          <pre className="mt-3 text-xs text-[var(--text-primary)] whitespace-pre-wrap">{it.body}</pre>
        </details>
      ))}
    </div>
  );
}

// =================== Dreams ===================

function DreamsTab() {
  const { data, error, isLoading } = useSWR<DreamsStateResponse>(
    SWR_KEYS.DREAMS_STATE,
    fetcher,
  );
  if (isLoading) return <div className="text-[var(--text-secondary)]">加载中...</div>;
  if (error) return <div className="text-neg">失败: {error.message}</div>;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <section>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">📋 最近 events（按时间倒序）</h3>
        <div className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] max-h-96 overflow-auto">
          <table className="w-full text-xs tabular-nums">
            <thead className="bg-[var(--surface-base)] text-[var(--text-tertiary)] sticky top-0">
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
                <tr key={i} className="border-t border-[var(--border-subtle)]">
                  <td className="px-2 py-1 text-[var(--text-tertiary)]">{shortTime(e.ts)}</td>
                  {/* phase 翻译为中文，原始机器字符串保留在 title tooltip */}
                  <td
                    className="px-2 py-1 text-[var(--text-primary)] font-mono"
                    title={String(e.phase)}
                  >
                    {labelPhase(String(e.phase))}
                  </td>
                  <td className="px-2 py-1 text-[var(--text-secondary)]">{(e as { asset?: string }).asset ?? "—"}</td>
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
        <details className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3">
          <summary className="text-xs text-[var(--text-secondary)] cursor-pointer">短期记忆 (short-term-recall.json)</summary>
          <pre className="mt-2 text-xs text-[var(--text-primary)] whitespace-pre-wrap max-h-72 overflow-auto">
            {JSON.stringify(data.short_term, null, 2)}
          </pre>
        </details>
      )}

      {data.candidates && (
        <details className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3">
          <summary className="text-xs text-[var(--text-secondary)] cursor-pointer">候选池 (candidates.json)</summary>
          <pre className="mt-2 text-xs text-[var(--text-primary)] whitespace-pre-wrap max-h-72 overflow-auto">
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
    SWR_KEYS.PNL_HISTORY,
    fetcher,
  );
  if (isLoading) return <div className="text-[var(--text-secondary)]">加载中...</div>;
  if (error) return <div className="text-neg">失败: {error.message}</div>;
  if (!data) return null;

  // 简单倒序展示，配合数字图标颜色
  const points = [...data.points].reverse(); // 最新在前

  return (
    <div className="space-y-3">
      <p className="text-xs text-[var(--text-tertiary)]">
        共 {data.count} 条快照（jobs/pnl_snapshot 工作日每 2h 写一条；含基准对比的 SVG 见主面板）
      </p>
      <div className="border border-[var(--border-subtle)] overflow-hidden">
        <table className="w-full text-xs tabular-nums">
          <thead className="bg-[var(--surface-raised)] text-[var(--text-tertiary)]">
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
                <tr key={i} className="border-t border-[var(--border-subtle)]">
                  <td className="px-3 py-1 text-[var(--text-tertiary)]">{shortTime(p.ts)}</td>
                  <td className={`px-3 py-1 text-right ${total >= 0 ? "text-pos" : "text-neg"}`}>
                    {total >= 0 ? "+" : ""}{total.toFixed(2)}
                  </td>
                  <td className="px-3 py-1 text-right text-[var(--text-secondary)]">
                    {ndq != null ? `${ndq >= 0 ? "+" : ""}${ndq.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-3 py-1 text-right text-[var(--text-secondary)]">
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

