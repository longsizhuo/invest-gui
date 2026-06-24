import { useState } from "react";
import useSWR from "swr";
import { motion, AnimatePresence } from "motion/react";
import {
  ApiError,
  fetcher,
  postJSON,
  type CommitteeRunResponse,
  type CommitteeSessionsResponse,
  type CommitteeSessionDetail,
  type Strategy,
} from "../../lib/api-client";
import { usePrivacy } from "../../lib/privacy";
import { SWR_KEYS } from "../../lib/swr-keys";
import { PipelineFlow, type AgentNode, type PipelineStage } from "../../components/PipelineFlow";
import { useLiveCommittee } from "../../lib/useLiveCommittee";
import { Button } from "../../components/Button";
import { VerdictBadge, RoleBadge } from "../../components/StatusBadge";
import { parseCommitteeMd, type ParsedCommittee } from "../../lib/parseCommitteeMd";
import { shortTime, labelPhase } from "../../lib/format";

/**
 * 委员会 Pipeline 页 — 默认 Live 真跑模式
 *
 * 用户选 symbol + max_rounds → 点[启动] → POST /api/committee/run_single
 * SSE 订阅 → 节点实时变绿 + 流动光点 + signal/strength 一并实时显示
 *
 * 旁边折叠"看历史决议"——用 markdown 解析后的 6 段构造静态 stages 给 PipelineFlow 看
 */
export function PipelineTab() {
  const [mode, setMode] = useState<"live" | "history">("live");

  return (
    <div className="space-y-4">
      <ModeToggle mode={mode} setMode={setMode} />
      {mode === "live" ? <LiveMode /> : <HistoryMode />}
    </div>
  );
}

function ModeToggle({ mode, setMode }: { mode: "live" | "history"; setMode: (m: "live" | "history") => void }) {
  return (
    <div className="flex gap-2">
      <button
        onClick={() => setMode("live")}
        className={`px-3 py-1.5 text-xs rounded transition ${
          mode === "live"
            ? "bg-[var(--accent)] text-[var(--accent-foreground)] font-semibold"
            : "bg-[var(--surface-overlay)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        }`}
      >
        🔴 真实运行
      </button>
      <button
        onClick={() => setMode("history")}
        className={`px-3 py-1.5 text-xs rounded transition ${
          mode === "history"
            ? "bg-[var(--accent)] text-[var(--accent-foreground)] font-semibold"
            : "bg-[var(--surface-overlay)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        }`}
      >
        📜 看历史决议
      </button>
    </div>
  );
}

// ============================================================
// Live 模式：真跑 + SSE 实时
// ============================================================

function LiveMode() {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const { stages, status, connState } = useLiveCommittee(taskId);
  const isRunning = status?.status === "queued" || status?.status === "running";

  const selectedAgent = stages
    .flatMap((s) => s.agents)
    .find((a) => a.id === selectedAgentId);

  return (
    <div className="space-y-6">
      <RunForm
        onSubmit={async (symbol, maxRounds) => {
          setSubmitError(null);
          setSubmitting(true);
          try {
            // v3 合并端点：传 symbols 数组（单元素也行），后端按需并行
            const res = await postJSON<{ symbols: string[]; max_debate_rounds: number }, CommitteeRunResponse>(
              SWR_KEYS.COMMITTEE_RUN,
              { symbols: [symbol], max_debate_rounds: maxRounds },
            );
            setTaskId(res.task_id);
            setSelectedAgentId(null);
          } catch (err) {
            setSubmitError(err instanceof ApiError ? err.detail : String(err));
          } finally {
            setSubmitting(false);
          }
        }}
        disabled={isRunning || submitting}
        running={isRunning}
        connState={connState}
      />

      {submitError && (
        <div className="text-sm text-neg px-4">⚠ {submitError}</div>
      )}

      {/* Pipeline 流程图 */}
      {(stages.length > 0 || isRunning) && (
        <PipelineFlow
          stages={stages}
          selectedAgentId={selectedAgentId}
          onAgentClick={(_, agent) => setSelectedAgentId(agent.id)}
        />
      )}

      {/* 选中 agent 的 preview */}
      <AnimatePresence mode="wait">
        {selectedAgent && (
          <motion.div
            key={selectedAgent.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <RoleBadge role={selectedAgent.role} />
              <span className="text-sm font-semibold text-[var(--text-primary)]">{selectedAgent.label}</span>
              {selectedAgent.signal && (
                <span className="text-xs text-[var(--text-secondary)]">
                  SIGNAL: <span className="text-[var(--accent)] font-mono">{selectedAgent.signal}</span>
                  {selectedAgent.strength != null && ` · STRENGTH ${selectedAgent.strength}`}
                </span>
              )}
            </div>
            {selectedAgent.preview ? (
              <pre className="text-xs text-[var(--text-primary)] whitespace-pre-wrap max-h-96 overflow-y-auto">
                {selectedAgent.preview}
              </pre>
            ) : (
              <p className="text-xs text-[var(--text-tertiary)]">该 agent 还没完成（preview 待补）</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 完成时的 verdict 卡 */}
      {status?.status === "done" && status.result && (
        <VerdictResultCard status={status} />
      )}
      {status?.status === "error" && (
        <div className="border border-[var(--neg)] chip-neg p-4 text-sm text-neg">
          ✗ 失败: {status.error ?? "未知"}
        </div>
      )}

      {/* 实时 events 流（折叠） */}
      {status?.events && status.events.length > 0 && (
        <details className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3">
          <summary className="text-xs text-[var(--text-secondary)] cursor-pointer">
            📋 完整事件流（{status.events.length} 条，最新在下）
          </summary>
          <div className="mt-2 space-y-1 max-h-60 overflow-y-auto">
            {status.events.map((e, i) => (
              <div key={i} className="text-xs font-mono text-[var(--text-secondary)] flex gap-2">
                <span className="text-[var(--text-tertiary)]">{shortTime(e.ts as string)}</span>
                {/* phase 翻译：用 labelOf 把机器字符串转成中文，原始值 hover tooltip 保留 */}
                <span
                  className="text-[var(--accent)]"
                  title={e.phase as string}
                >
                  {labelPhase(e.phase as string)}
                </span>
                {e.round != null && <span className="text-[var(--text-tertiary)]">round={e.round as number}</span>}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

// ============================================================
// 启动表单
// ============================================================

function RunForm({
  onSubmit,
  disabled,
  running,
  connState,
}: {
  onSubmit: (symbol: string, maxRounds: number) => void;
  disabled: boolean;
  running: boolean;
  connState: string;
}) {
  const [symbol, setSymbol] = useState("");
  const [maxRounds, setMaxRounds] = useState(4);

  const { data: strategy } = useSWR<Strategy>(SWR_KEYS.STRATEGY, fetcher);
  const symbols = strategy?.target_assets.map((a) => a.symbol) ?? [];

  // 默认选第一个资产
  if (!symbol && symbols.length > 0) {
    setSymbol(symbols[0]);
  }

  return (
    <div className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="text-xs text-[var(--text-tertiary)] block mb-1">资产</label>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            disabled={disabled}
            className="bg-[var(--surface-base)] border border-[var(--border-strong)] rounded px-3 py-2 text-sm font-mono"
          >
            {symbols.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-[var(--text-tertiary)] block mb-1">辩论上限</label>
          <select
            value={maxRounds}
            onChange={(e) => setMaxRounds(parseInt(e.target.value, 10))}
            disabled={disabled}
            className="bg-[var(--surface-base)] border border-[var(--border-strong)] rounded px-3 py-2 text-sm tabular-nums"
          >
            <option value={1}>1 轮（不辩论，旧行为）</option>
            <option value={2}>2 轮（最少 cross-challenge）</option>
            <option value={3}>3 轮</option>
            <option value={4}>4 轮（推荐）</option>
            <option value={6}>6 轮（极限）</option>
            <option value={8}>8 轮（实验）</option>
          </select>
        </div>
        <Button
          onClick={() => onSubmit(symbol, maxRounds)}
          disabled={disabled || !symbol}
        >
          {running ? `🔄 运行中... (${connState})` : "▶ 启动委员会"}
        </Button>
      </div>
      <p className="text-xs text-[var(--text-tertiary)] mt-3">
        Round 1 / Round 2..N 内部 Quant + Risk <strong className="text-[var(--text-primary)]">真并行</strong>；
        每轮检查收敛（连续 2 轮 SIGNAL/STRENGTH 不变）→ 提前退出；
        预计耗时 {Math.ceil(maxRounds * 0.6 + 1)} 分钟
        {/* token 成本仅在 hover tooltip 展示，避免吓到小白用户 */}
        <span
          title={`预估 LLM 费用 ~¥${(maxRounds * 0.0008).toFixed(3)}`}
          className="ml-1 underline underline-offset-2 cursor-help"
        >
          (?)
        </span>
      </p>
    </div>
  );
}

// ============================================================
// Verdict 结果卡
// ============================================================

function VerdictResultCard({ status }: { status: { result?: unknown } }) {
  const result = status.result as {
    asset?: string;
    verdict?: { verdict?: string; confidence?: number; alloc_cny?: number; dominant_view?: string };
    debate_meta?: { final_round?: number; max_rounds?: number; converged?: boolean };
  } | null;
  const { enabled: privacyOn } = usePrivacy();
  if (!result) return null;
  const v = result.verdict;
  const dm = result.debate_meta;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="border ring-[var(--border-strong)] bg-gradient-to-r from-[var(--surface-overlay)] to-[var(--surface-raised)] p-5"
    >
      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-3">🎬 委员会决议</h3>
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <div>
          <div className="text-xs text-[var(--text-tertiary)]">资产</div>
          <div className="font-mono text-[var(--accent)]">{result.asset ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs text-[var(--text-tertiary)]">verdict</div>
          <VerdictBadge verdict={v?.verdict ?? null} />
        </div>
        <div>
          <div className="text-xs text-[var(--text-tertiary)]">置信度</div>
          <div className="text-lg tabular-nums text-[var(--accent)] font-semibold">
            {v?.confidence != null ? v.confidence.toFixed(2) : "—"}
          </div>
        </div>
        {v?.dominant_view && (
          <div>
            <div className="text-xs text-[var(--text-tertiary)]">主导角色</div>
            <RoleBadge role={v.dominant_view} />
          </div>
        )}
        {v?.alloc_cny != null && (
          <div>
            <div className="text-xs text-[var(--text-tertiary)]">建议 ¥</div>
            <div
              className={`text-sm tabular-nums font-semibold ${
                v.alloc_cny > 0
                  ? "text-pos"
                  : v.alloc_cny < 0
                    ? "text-neg"
                    : "text-[var(--text-secondary)]"
              }`}
            >
              {privacyOn ? "±●●●" : `${v.alloc_cny > 0 ? "+" : ""}${v.alloc_cny.toLocaleString()}`}
            </div>
          </div>
        )}
        {dm && (
          <div className="ml-auto text-xs text-[var(--text-secondary)]">
            🗣 {dm.final_round}/{dm.max_rounds} 轮{" "}
            {dm.converged ? <span className="text-pos">✓ 已收敛</span> : <span className="text-warn">达上限</span>}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================
// History 模式：看历史决议（旧 markdown 解析）
// ============================================================

function HistoryMode() {
  // 历史模式拉最近 30 条（SWR_KEYS 中无专项 30 条常量，直接在 base 后拼 query）
  const { data: sessions } = useSWR<CommitteeSessionsResponse>(
    `${SWR_KEYS.COMMITTEE_SESSIONS_BASE}?limit=30`,
    fetcher,
  );
  const [selected, setSelected] = useState<{ date: string; symbol: string } | null>(null);

  // 默认选第一条
  if (!selected && sessions && sessions.sessions.length > 0) {
    const s = sessions.sessions[0];
    setSelected({ date: s.date, symbol: s.symbol });
  }

  const { data: detail } = useSWR<CommitteeSessionDetail>(
    selected
      ? SWR_KEYS.committeeSessionDetail(selected.date, selected.symbol)
      : null,
    fetcher,
  );

  const parsed = detail ? parseCommitteeMd(detail.content) : null;
  const stages: PipelineStage[] = parsed ? buildHistoryStages(parsed) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-xs text-[var(--text-tertiary)]">选择历史决议:</label>
        <select
          value={selected ? `${selected.date}::${selected.symbol}` : ""}
          onChange={(e) => {
            const [date, symbol] = e.target.value.split("::");
            setSelected({ date, symbol });
          }}
          className="bg-[var(--surface-base)] border border-[var(--border-strong)] rounded px-2 py-1.5 text-sm font-mono"
        >
          {sessions?.sessions.map((s, i) => (
            <option key={i} value={`${s.date}::${s.symbol}`}>
              {s.date} · {s.symbol} · {s.verdict ?? "?"} ({s.confidence ?? "?"})
            </option>
          ))}
        </select>
      </div>

      {parsed && (
        <>
          <PipelineFlow stages={stages} />

          {/* 确定性事实块（后端 v0.6.0+，非 LLM 输出）：估值 + 市场情绪表盘 */}
          {(parsed.sections.valuation || parsed.sections.sentiment) && (
            <div className="grid gap-3 md:grid-cols-2">
              {parsed.sections.valuation && (
                <details open className="rounded border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3">
                  <summary className="cursor-pointer text-sm text-[var(--text-primary)]">
                    📐 估值（确定性事实块，非 LLM）
                  </summary>
                  <pre className="mt-2 text-xs text-[var(--text-secondary)] whitespace-pre-wrap">
                    {parsed.sections.valuation}
                  </pre>
                </details>
              )}
              {parsed.sections.sentiment && (
                <details open className="rounded border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3">
                  <summary className="cursor-pointer text-sm text-[var(--text-primary)]">
                    🌡 市场情绪表盘（确定性事实块，非 LLM）
                  </summary>
                  <pre className="mt-2 text-xs text-[var(--text-secondary)] whitespace-pre-wrap">
                    {parsed.sections.sentiment}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* 简化展示：分段卡片 */}
          <div className="grid gap-3 md:grid-cols-2">
            {stages.flatMap((s) =>
              s.agents.map((a) => (
                <details key={a.id} className="rounded border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3">
                  <summary className="cursor-pointer text-sm">
                    <RoleBadge role={a.role} /> <span className="ml-2 text-[var(--text-primary)]">{s.label} — {a.label}</span>
                  </summary>
                  {a.preview && (
                    <pre className="mt-2 text-xs text-[var(--text-secondary)] whitespace-pre-wrap max-h-60 overflow-auto">
                      {a.preview}
                    </pre>
                  )}
                </details>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

function buildHistoryStages(parsed: ParsedCommittee): PipelineStage[] {
  const sec = parsed.sections;
  const has = (s: string) => s && s.trim().length > 0;

  const macroAgent: AgentNode = {
    id: "h_macro", role: "macro", label: "Macro", icon: "🌍",
    state: has(sec.macro) ? "done" : "pending",
    preview: sec.macro || null,
  };

  const r1: PipelineStage = {
    id: "h_round_1",
    label: "Round 1",
    hint: "独立陈述",
    state: has(sec.quant_r1) || has(sec.risk_r1) ? "done" : "pending",
    agents: [
      { id: "h_quant_r1", role: "quant", label: "Quant", icon: "📊",
        state: has(sec.quant_r1) ? "done" : "pending",
        preview: sec.quant_r1 || null },
      { id: "h_risk_r1", role: "risk", label: "Risk", icon: "🛡",
        state: has(sec.risk_r1) ? "done" : "pending",
        preview: sec.risk_r1 || null },
    ],
  };

  const r2Visible = has(sec.quant_r2) || has(sec.risk_r2);
  const r2: PipelineStage = {
    id: "h_round_2",
    label: "Round 2",
    hint: "cross-challenge",
    state: r2Visible ? "done" : "pending",
    agents: [
      { id: "h_quant_r2", role: "quant", label: "Quant", icon: "📊",
        state: has(sec.quant_r2) ? "done" : "pending",
        preview: sec.quant_r2 || null },
      { id: "h_risk_r2", role: "risk", label: "Risk", icon: "🛡",
        state: has(sec.risk_r2) ? "done" : "pending",
        preview: sec.risk_r2 || null },
    ],
  };

  const cio: PipelineStage = {
    id: "h_cio",
    label: "CIO",
    hint: "综合决策",
    state: has(sec.cio) ? "done" : "pending",
    agents: [
      { id: "h_cio", role: "cio", label: "CIO", icon: "👔",
        state: has(sec.cio) ? "done" : "pending",
        preview: sec.cio || null },
    ],
  };

  return [
    {
      id: "h_macro_stage",
      label: "Macro",
      hint: "宏观共享",
      state: macroAgent.state === "done" ? "done" : "pending",
      agents: [macroAgent],
    },
    r1,
    r2,
    cio,
  ];
}
