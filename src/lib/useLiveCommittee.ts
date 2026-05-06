import { useEffect, useRef, useState, useMemo } from "react";
import type {
  AgentNode,
  PipelineStage,
} from "../components/PipelineFlow";
import type { CommitteeStatusResponse } from "./api-client";

export type LiveConnState = "idle" | "connecting" | "live" | "closed" | "error";

/**
 * Live 委员会订阅 hook
 *
 * 后端 /api/committee/live/{task_id} 推 status.json，含：
 *   - phase: "macro_done" / "round_1_done" / "round_N_done" / "converged" / "cio_done"
 *   - events: [{phase, ts, quant_preview, risk_preview, ...}]
 *   - status: queued/running/done/error
 *
 * 我们把 phase + events 翻译成 PipelineStage[]：动态长度（多轮辩论时拉长）
 */
export function useLiveCommittee(taskId: string | null) {
  const [status, setStatus] = useState<CommitteeStatusResponse | null>(null);
  const [connState, setConnState] = useState<LiveConnState>("idle");
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!taskId) {
      setStatus(null);
      setConnState("idle");
      return;
    }
    setConnState("connecting");
    const es = new EventSource(`/api/committee/live/${encodeURIComponent(taskId)}`);
    esRef.current = es;

    const handleProgress = (e: MessageEvent) => {
      setConnState("live");
      try {
        setStatus(JSON.parse(e.data));
      } catch {
        // 略
      }
    };
    const handleTerminal = (e: MessageEvent) => {
      try {
        setStatus(JSON.parse(e.data));
      } catch { /* ignore */ }
      setConnState("closed");
      es.close();
    };

    es.addEventListener("progress", handleProgress);
    es.addEventListener("done", handleTerminal);
    es.addEventListener("error", handleTerminal);
    es.addEventListener("not_found", handleTerminal);
    es.addEventListener("timeout", handleTerminal);
    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) setConnState("error");
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [taskId]);

  const stages = useMemo(() => buildStages(status), [status]);
  return { status, stages, connState };
}

// ============================================================
// status.json → PipelineStage[] 构造逻辑
// ============================================================

interface RawEvent {
  ts?: string;
  phase?: string;
  quant_preview?: string;
  risk_preview?: string;
  macro_preview?: string;
  memo_preview?: string;
  quant_signal?: [string | null, number | null] | null;
  risk_signal?: [string | null, number | null] | null;
  round?: number;
  at_round?: number;
  symbol?: string;
}

function buildStages(status: CommitteeStatusResponse | null): PipelineStage[] {
  if (!status) return [];

  const events = ((status as { events?: RawEvent[] }).events ?? []) as RawEvent[];
  const isDone = status.status === "done";
  const isError = status.status === "error";
  const currentPhase = (status as { phase?: string }).phase ?? "";
  const maxRounds = (status as { max_debate_rounds?: number }).max_debate_rounds ?? 4;

  // 收集每个 round 的最新 event（取 events 列表里最后一条）
  const macroDoneEvent = events.find((e) => e.phase === "macro_done");
  const roundDoneEvents: Record<number, RawEvent> = {};
  for (const e of events) {
    if (!e.phase) continue;
    const m = e.phase.match(/^round_(\d+)_done$/);
    if (m) {
      roundDoneEvents[parseInt(m[1], 10)] = e;
    }
  }
  const cioDoneEvent = events.find((e) => e.phase === "cio_done");
  const convergedEvent = events.find((e) => e.phase === "converged");

  // 已知跑了多少轮：events 里 round_N_done 的最大 N
  const completedRounds = Object.keys(roundDoneEvents).map(Number);
  const maxCompletedRound = completedRounds.length > 0 ? Math.max(...completedRounds) : 0;

  // 当前正在哪轮：phase = round_N_start 时是第 N 轮 active
  let activeRound = 0;
  const startMatch = currentPhase.match(/^round_(\d+)_start$/);
  if (startMatch) {
    activeRound = parseInt(startMatch[1], 10);
  }

  // 总展示几轮：已完成 + 当前活跃，至少 1（如果还没开始）
  const visibleRounds = Math.max(maxCompletedRound, activeRound);

  // 组装 stages
  const stages: PipelineStage[] = [];

  // Stage 1: Macro
  const macroState = isError && currentPhase === "macro_start"
    ? "active"
    : macroDoneEvent
      ? "done"
      : currentPhase === "macro_start" || currentPhase === "preparing" || currentPhase === "data_ready"
        ? "active"
        : "pending";
  stages.push({
    id: "macro",
    label: "Macro",
    hint: "宏观共享",
    state: macroState as "pending" | "active" | "done",
    agents: [
      {
        id: "macro_node",
        role: "macro",
        label: "Macro",
        icon: "🌍",
        state: macroState === "done" ? "done" : macroState === "active" ? "active" : "pending",
        preview: macroDoneEvent?.macro_preview ?? null,
      },
    ],
  });

  // Stage 2..N: 每一轮辩论
  if (visibleRounds > 0 || macroDoneEvent) {
    const roundsToShow = Math.max(1, visibleRounds);
    for (let r = 1; r <= roundsToShow; r++) {
      const doneEvt = roundDoneEvents[r];
      const isActive = activeRound === r && !doneEvt;
      const stageState: "pending" | "active" | "done" =
        doneEvt ? "done" : isActive ? "active" : "pending";
      const agentState: AgentNode["state"] =
        doneEvt ? "done" : isActive ? "active" : "pending";

      const isFork = r === 1 || r >= 2;   // Round 1 独立陈述；Round 2+ cross-challenge — 都是 2 agent 并行
      void isFork;

      const quantSignal = doneEvt?.quant_signal;
      const riskSignal = doneEvt?.risk_signal;

      stages.push({
        id: `round_${r}`,
        label: r === 1 ? "Round 1" : `Round ${r}`,
        hint: r === 1 ? "独立陈述（信息分隔）" : "cross-challenge",
        state: stageState,
        agents: [
          {
            id: `quant_r${r}`,
            role: "quant",
            label: "Quant",
            icon: "📊",
            state: agentState,
            preview: doneEvt?.quant_preview ?? null,
            signal: Array.isArray(quantSignal) ? (quantSignal[0] ?? null) : null,
            strength: Array.isArray(quantSignal) ? (quantSignal[1] ?? null) : null,
          },
          {
            id: `risk_r${r}`,
            role: "risk",
            label: "Risk",
            icon: "🛡",
            state: agentState,
            preview: doneEvt?.risk_preview ?? null,
            signal: Array.isArray(riskSignal) ? (riskSignal[0] ?? null) : null,
            strength: Array.isArray(riskSignal) ? (riskSignal[1] ?? null) : null,
          },
        ],
      });
    }
  }

  // 收敛标记（在最后一轮的 hint 里加）
  if (convergedEvent && stages.length > 0) {
    const lastRoundIdx = stages.length - 1;
    const last = stages[lastRoundIdx];
    if (last.id.startsWith("round_")) {
      stages[lastRoundIdx] = {
        ...last,
        hint: `${last.hint ?? ""} · ✓ 已收敛`.trim(),
      };
    }
  }

  // Stage final: CIO
  const cioStarted = currentPhase === "cio_start";
  const cioState: "pending" | "active" | "done" = cioDoneEvent
    ? "done"
    : cioStarted
      ? "active"
      : isDone
        ? "done"
        : "pending";
  stages.push({
    id: "cio",
    label: "CIO",
    hint: "综合决策",
    state: cioState,
    agents: [
      {
        id: "cio_node",
        role: "cio",
        label: "CIO",
        icon: "👔",
        state: isError ? "error" : cioState === "done" ? "done" : cioState === "active" ? "active" : "pending",
        preview: cioDoneEvent?.memo_preview ?? null,
      },
    ],
  });

  // 标注 max_rounds 在 Macro 的 hint 上
  if (stages[0]) {
    stages[0] = {
      ...stages[0],
      hint: `宏观共享 · 总 ${maxRounds} 轮上限`,
    };
  }

  return stages;
}
