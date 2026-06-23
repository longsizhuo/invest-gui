import { PipelineFlow } from "invest-gui";

// PipelineFlow renders committee execution stages. macro/cio stages hold 1 agent,
// debate rounds fork into quant + risk. The component animates each stage in from
// `initial={{opacity:0, x:20}}` (motion/react); a static screenshot catches it at
// opacity:0 (blank). The stage circles themselves have no `initial` so they're
// already at their final color — only the stage WRAPPER's entrance opacity hides
// them. The scoped `<style>` below forces those inline opacity/transform values to
// their settled frame so the static card shows the real pipeline.
// Local alias rather than importing the type — the synth-mode "invest-gui" entry
// only re-exports components, not its exported types.
type PipelineStage = Parameters<typeof PipelineFlow>[0]["stages"][number];

// Mid-run: macro done, round 1 active (quant done, risk still thinking), cio pending.
const running: PipelineStage[] = [
  {
    id: "macro",
    label: "宏观",
    hint: "市场环境",
    state: "done",
    agents: [
      { id: "macro-1", role: "macro", label: "Macro", icon: "🌍", state: "done", signal: "risk_on", strength: 7 },
    ],
  },
  {
    id: "round_1",
    label: "Round 1",
    hint: "独立陈述",
    state: "active",
    agents: [
      { id: "quant-1", role: "quant", label: "Quant", icon: "📊", state: "done", signal: "bullish", strength: 8 },
      { id: "risk-1", role: "risk", label: "Risk", icon: "⚠️", state: "active", signal: null },
    ],
  },
  {
    id: "cio",
    label: "CIO",
    hint: "综合裁决",
    state: "pending",
    agents: [{ id: "cio-1", role: "cio", label: "CIO", icon: "⚖️", state: "pending" }],
  },
];

// Finished run: every stage done, full 2-round debate before CIO verdict.
const complete: PipelineStage[] = [
  {
    id: "macro",
    label: "宏观",
    state: "done",
    agents: [{ id: "m", role: "macro", label: "Macro", icon: "🌍", state: "done", signal: "risk_on", strength: 7 }],
  },
  {
    id: "round_1",
    label: "Round 1",
    hint: "独立陈述",
    state: "done",
    agents: [
      { id: "q1", role: "quant", label: "Quant", icon: "📊", state: "done", signal: "bullish", strength: 8 },
      { id: "r1", role: "risk", label: "Risk", icon: "⚠️", state: "done", signal: "concerned" },
    ],
  },
  {
    id: "round_2",
    label: "Round 2",
    hint: "cross-challenge",
    state: "done",
    agents: [
      { id: "q2", role: "quant", label: "Quant", icon: "📊", state: "done", signal: "bullish", strength: 7 },
      { id: "r2", role: "risk", label: "Risk", icon: "⚠️", state: "error", signal: "high_risk" },
    ],
  },
  {
    id: "cio",
    label: "CIO",
    hint: "BUY · ¥12k",
    state: "done",
    agents: [{ id: "cio", role: "cio", label: "CIO", icon: "⚖️", state: "done", signal: "BUY" }],
  },
];

const settleCss = `.ds-pf-fix [style*="opacity"]{opacity:1 !important} .ds-pf-fix [style*="transform"]{transform:none !important}`;

export const Running = () => (
  <div className="ds-pf-fix" style={{ width: 640 }}>
    <style>{settleCss}</style>
    <PipelineFlow stages={running} selectedAgentId="quant-1" />
  </div>
);

export const Complete = () => (
  <div className="ds-pf-fix" style={{ width: 720 }}>
    <style>{settleCss}</style>
    <PipelineFlow stages={complete} />
  </div>
);

export const Empty = () => (
  <div style={{ width: 420 }}>
    <PipelineFlow stages={[]} />
  </div>
);
