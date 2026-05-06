import { Tabs } from "../../components/Tabs";
import { LiveTab } from "./LiveTab";
import { HistoryTab } from "./HistoryTab";
import { PipelineTab } from "./PipelineTab";
import { AgentsTab } from "./AgentsTab";
import { AccuracyTab } from "./AccuracyTab";
import { LlmUsageTab } from "./LlmUsageTab";
import { ToolCallsTab } from "./ToolCallsTab";

/**
 * 委员会页 —— 一切关于"AI 怎么决策"
 *
 * 触发新跑（Live）+ 决策回放（Pipeline）+ 角色规则（Agents）+ 历史命中（Accuracy）
 *   + LLM 用量（Llm）+ Tool 调用（Tools）
 *
 * 之前 /transparency 和 /system 的"委员会库" tab 全部并入这里。
 * Cron / Regime / Insights / Dreams / PnL / 数据源健康 仍在 /system。
 */
export default function Committee() {
  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-3xl text-[var(--text-primary)] mb-1">
          投资委员会
        </h1>
        <p className="text-xs text-[var(--text-tertiary)] font-mono">
          触发 + 直播 + 4 角色规则 + 命中率 + LLM 成本 + Tool 调用
        </p>
      </header>

      <Tabs
        tabs={[
          {
            id: "live",
            label: "触发 / 直播",
            hint: "手动启动 + SSE 实时推送",
            render: () => <LiveTab />,
          },
          {
            id: "history",
            label: "决议归档",
            hint: "所有历史决议 markdown",
            render: () => <HistoryTab />,
          },
          {
            id: "pipeline",
            label: "决策回放",
            hint: "看 AI 一步步思考",
            render: () => <PipelineTab />,
          },
          {
            id: "agents",
            label: "4 角色 + 规则",
            hint: "system prompt 全文 + REGIME 阈值",
            render: () => <AgentsTab />,
          },
          {
            id: "accuracy",
            label: "历史命中率",
            hint: "事后真实数据",
            render: () => <AccuracyTab />,
          },
          {
            id: "llm",
            label: "LLM 用量",
            hint: "token / 成本 / 延迟",
            render: () => <LlmUsageTab />,
          },
          {
            id: "tools",
            label: "Tool 调用",
            hint: "agent 查了什么数据",
            render: () => <ToolCallsTab />,
          },
        ]}
        defaultId="live"
      />
    </div>
  );
}
