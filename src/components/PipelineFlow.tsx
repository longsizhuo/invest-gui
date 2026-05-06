import { motion, AnimatePresence } from "motion/react";

/**
 * 委员会 Pipeline 流程图（动态 stage 版 v2）
 *
 * 支持任意 stage 数（1 个 macro / N 个辩论 round / 1 个 cio）
 * 每 stage 内部 1-2 个 agent（fork-join 视觉）
 * Stage 之间连线 + 流动光点
 */

export type AgentState = "pending" | "active" | "done" | "error";
export type StageState = "pending" | "active" | "done";

export interface AgentNode {
  id: string;
  role: "macro" | "quant" | "risk" | "cio";
  label: string;
  icon: string;
  state: AgentState;
  preview?: string | null;
  signal?: string | null;
  strength?: number | null;
}

export interface PipelineStage {
  id: string;            // "macro" / "round_1" / "round_2" / ... / "cio"
  label: string;          // "宏观" / "Round 1 独立陈述" / "Round 2 cross-challenge" / ...
  hint?: string;
  agents: AgentNode[];    // 1（macro/cio）或 2（quant + risk）
  state: StageState;
}

const ROLE_COLORS = {
  macro: { active: "#a855f7", done: "#22c55e", pending: "#3f3f46" },
  quant: { active: "#3b82f6", done: "#22c55e", pending: "#3f3f46" },
  risk: { active: "#f97316", done: "#22c55e", pending: "#3f3f46" },
  cio: { active: "#fbbf24", done: "#22c55e", pending: "#3f3f46" },
};

export function PipelineFlow({
  stages,
  selectedStageId,
  selectedAgentId,
  onAgentClick,
}: {
  stages: PipelineStage[];
  selectedStageId?: string | null;
  selectedAgentId?: string | null;
  onAgentClick?: (stage: PipelineStage, agent: AgentNode) => void;
}) {
  if (stages.length === 0) {
    return (
      <div className="rounded-lg ring-1 ring-zinc-800 bg-zinc-900 p-6 text-center text-zinc-500">
        等待启动...
      </div>
    );
  }

  return (
    <div className="rounded-lg ring-1 ring-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 overflow-x-auto">
      <div className="flex items-stretch gap-2 min-w-fit">
        <AnimatePresence>
          {stages.map((stage, i) => {
            const isLast = i === stages.length - 1;
            const nextActive =
              !isLast && (stage.state === "done" || stage.state === "active");
            const flowing = !isLast && stage.state === "active";
            return (
              <motion.div
                key={stage.id}
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="flex items-stretch"
              >
                <StageBlock
                  stage={stage}
                  selectedStageId={selectedStageId}
                  selectedAgentId={selectedAgentId}
                  onAgentClick={onAgentClick}
                />
                {!isLast && <StageConnector active={nextActive} flowing={flowing} />}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StageBlock({
  stage,
  selectedStageId,
  selectedAgentId,
  onAgentClick,
}: {
  stage: PipelineStage;
  selectedStageId?: string | null;
  selectedAgentId?: string | null;
  onAgentClick?: (stage: PipelineStage, agent: AgentNode) => void;
}) {
  const isStageSelected = selectedStageId === stage.id;
  return (
    <div className="flex flex-col items-center min-w-[140px]">
      {/* Stage 标题 */}
      <div className="text-center mb-3">
        <div
          className={`text-xs font-semibold ${
            stage.state === "active"
              ? "text-gold-300"
              : stage.state === "done"
                ? "text-green-400"
                : "text-zinc-500"
          } ${isStageSelected ? "underline" : ""}`}
        >
          {stage.label}
        </div>
        {stage.hint && (
          <div className="text-[10px] text-zinc-600 mt-0.5">{stage.hint}</div>
        )}
      </div>

      {/* agents 列：1 个垂直居中；2 个上下分叉 */}
      <div
        className={`flex flex-1 ${
          stage.agents.length > 1 ? "flex-col gap-3 justify-center" : "items-center justify-center"
        }`}
      >
        {stage.agents.map((agent) => (
          <AgentNodeView
            key={agent.id}
            agent={agent}
            selected={selectedAgentId === agent.id}
            onClick={() => onAgentClick?.(stage, agent)}
          />
        ))}
      </div>
    </div>
  );
}

function AgentNodeView({
  agent,
  selected,
  onClick,
}: {
  agent: AgentNode;
  selected: boolean;
  onClick: () => void;
}) {
  const colors = ROLE_COLORS[agent.role];
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`relative flex flex-col items-center gap-1 cursor-pointer focus:outline-none ${
        selected ? "ring-2 ring-gold-500 ring-offset-2 ring-offset-zinc-950 rounded-full" : ""
      }`}
      title={agent.preview ?? agent.label}
    >
      {/* 节点圆 */}
      <motion.div
        className="relative w-12 h-12 rounded-full flex items-center justify-center text-xl"
        animate={{
          backgroundColor:
            agent.state === "error"
              ? "#ef4444"
              : agent.state === "done"
                ? colors.done
                : agent.state === "active"
                  ? colors.active
                  : colors.pending,
          scale: agent.state === "active" ? 1.1 : 1,
        }}
        transition={{ duration: 0.4 }}
      >
        {agent.state === "active" && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: colors.active }}
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <span className="relative z-10">
          {agent.state === "done" ? "✓" : agent.state === "error" ? "✗" : agent.icon}
        </span>
      </motion.div>

      <div className="text-[11px] text-zinc-400 font-mono">{agent.label}</div>
      {agent.signal && (
        <div className="text-[10px] text-zinc-500">
          {agent.signal}
          {agent.strength != null && ` · ${agent.strength}`}
        </div>
      )}
    </motion.button>
  );
}

function StageConnector({ active, flowing }: { active: boolean; flowing: boolean }) {
  return (
    <div className="w-12 self-center h-1 mx-1 relative overflow-hidden rounded-full">
      <div
        className={`absolute inset-0 ${
          active ? "bg-gradient-to-r from-blue-500/40 to-blue-500/40" : "bg-zinc-800"
        }`}
      />
      {active && !flowing && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-blue-500 to-green-500"
          initial={{ scaleX: 0, originX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6 }}
        />
      )}
      <AnimatePresence>
        {flowing && (
          <>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute top-0 h-1 w-2.5 rounded-full bg-gold-400 shadow-[0_0_8px_2px_rgba(251,191,36,0.6)]"
                initial={{ x: "-12px" }}
                animate={{ x: ["0%", "100%"] }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  ease: "linear",
                  delay: i * 0.4,
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
