import { Tabs } from "../../components/Tabs";
import { PipelineTab } from "./PipelineTab";
import { AgentsTab } from "./AgentsTab";
import { AccuracyTab } from "./AccuracyTab";
import { LlmUsageTab } from "./LlmUsageTab";
import { ToolCallsTab } from "./ToolCallsTab";
import { DataSourcesTab } from "./DataSourcesTab";

/**
 * AI 透视页 — 让用户/外部 agent 看到所有静默动作
 *
 * 默认页：🎬 Pipeline 流程图（动画），其他 tab 是辅助展示
 */
export default function Transparency() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold mb-1">🔬 AI 透视</h1>
        <p className="text-xs text-zinc-500">
          看 AI 6 步辩论的完整思考过程 + 真实命中率 + LLM 成本 + Tool 调用 + 数据源
        </p>
      </header>

      <Tabs
        tabs={[
          { id: "pipeline", label: "🎬 决策回放", hint: "看 AI 一步步思考", render: () => <PipelineTab /> },
          { id: "agents", label: "🧠 4 角色 + 规则", hint: "system prompt 全文", render: () => <AgentsTab /> },
          { id: "accuracy", label: "🎯 历史命中率", hint: "事后真实数据", render: () => <AccuracyTab /> },
          { id: "llm", label: "💰 LLM 用量", hint: "token / 成本", render: () => <LlmUsageTab /> },
          { id: "tools", label: "🔧 Tool 调用", hint: "agent 查了什么数据", render: () => <ToolCallsTab /> },
          { id: "data", label: "📡 数据源健康", hint: "10 个数据源状态", render: () => <DataSourcesTab /> },
        ]}
        defaultId="pipeline"
      />
    </div>
  );
}
