import useSWR from "swr";
import { fetcher, type RegimeRulesResponse, type AgentPromptInfo } from "../../lib/api-client";
import { RoleBadge } from "../../components/StatusBadge";

/**
 * 4 角色 prompt + REGIME 硬规则展示
 * 这是 marketing 主战场 — 让陌生人 30 秒看完知道"这个 AI 不是黑盒"
 */
export function AgentsTab() {
  const { data, error, isLoading } = useSWR<RegimeRulesResponse>("/api/regime_rules", fetcher);

  if (isLoading) return <div className="text-zinc-400">加载规则...</div>;
  if (error) return <div className="text-red-400">加载失败: {error.message}</div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* 顶部：5 verdict + sanity check 一览 */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg ring-1 ring-zinc-800 bg-zinc-900 p-4">
          <h3 className="text-sm font-semibold text-zinc-300 mb-2">5 个 verdict 选项</h3>
          <ul className="text-xs text-zinc-300 space-y-1">
            {data.verdict_options.map((v) => (
              <li key={v} className="font-mono">
                <span className="text-gold-400">{v}</span>
                {v === "BUY" && " — 一次建满（仅强 bullish + Risk ok）"}
                {v === "ACCUMULATE" && " — 逆势分批"}
                {v === "HOLD" && " — 维持现状"}
                {v === "TRIM" && " — 部分减仓"}
                {v === "SELL" && " — 全部清仓"}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg ring-1 ring-zinc-800 bg-zinc-900 p-4">
          <h3 className="text-sm font-semibold text-zinc-300 mb-2">CIO Sanity Check（防 LLM 幻觉）</h3>
          <ul className="text-xs text-zinc-300 space-y-1">
            {data.sanity_checks.map((s, i) => (
              <li key={i} className="leading-relaxed">• {s}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* REGIME 硬规则 */}
      <div className="rounded-lg ring-1 ring-zinc-800 bg-zinc-900 p-4">
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">📊 REGIME 硬规则</h3>
        <p className="text-xs text-zinc-400 mb-3">
          市场 regime 是「确定性算出」的硬约束（不是 LLM 判断）。Quant agent 必须遵守，防止震荡市底部错喊 bearish。
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="text-xs text-zinc-400 mb-2">阈值表</h4>
            <table className="w-full text-xs tabular-nums">
              <tbody>
                {Object.entries(data.regime_thresholds).map(([k, v]) => (
                  <tr key={k} className="border-t border-zinc-800">
                    <td className="px-2 py-1 font-mono text-zinc-400">{k}</td>
                    <td className="px-2 py-1 text-right text-gold-400">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h4 className="text-xs text-zinc-400 mb-2">优先级 + 类型</h4>
            <ol className="text-xs text-zinc-300 space-y-1">
              {data.regime_priority.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {/* 4 角色卡片 */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-300">🧠 4 个 Agent 角色（system prompt 全文）</h3>
        {data.agents.map((agent) => (
          <AgentCard key={agent.role} agent={agent} />
        ))}
      </div>

      {/* 5 个 tool */}
      <div className="rounded-lg ring-1 ring-zinc-800 bg-zinc-900 p-4">
        <h3 className="text-sm font-semibold text-zinc-300 mb-2">
          🔧 LLM 可调的 5 个 tool（function calling）
        </h3>
        <div className="space-y-2">
          {data.tools.map((tool, i) => {
            const fn = (tool as { function?: { name?: string; description?: string } }).function;
            return (
              <div key={i} className="border-t border-zinc-800 pt-2">
                <code className="text-gold-400 font-mono text-sm">{fn?.name ?? "?"}</code>
                <p className="text-xs text-zinc-400 mt-1">{fn?.description ?? ""}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AgentCard({ agent }: { agent: AgentPromptInfo }) {
  return (
    <div className="rounded-lg ring-1 ring-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-baseline justify-between mb-3">
        <div className="flex items-center gap-2">
          <RoleBadge role={agent.role} />
          <span className="text-sm font-semibold text-zinc-200">{agent.label}</span>
        </div>
        <div className="text-xs text-zinc-500 tabular-nums">
          temp {agent.temperature} · tools {agent.enable_tools ? "✓" : "·"}
        </div>
      </div>
      <p className="text-xs text-zinc-400 mb-3">{agent.description}</p>

      {(agent.notes ?? []).length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs font-semibold text-zinc-300 mb-1">硬规则</h4>
          <ul className="text-xs text-zinc-400 space-y-1">
            {(agent.notes ?? []).map((n, i) => (
              <li key={i}>• {n}</li>
            ))}
          </ul>
        </div>
      )}

      {agent.prompt_full && (
        <PromptDetails label="完整 system prompt" prompt={agent.prompt_full} />
      )}
      {agent.prompt_opening && (
        <PromptDetails label="Round 1 prompt (opening)" prompt={agent.prompt_opening} />
      )}
      {agent.prompt_rebuttal && (
        <PromptDetails label="Round 2 prompt (rebuttal, cross-challenge)" prompt={agent.prompt_rebuttal} />
      )}
    </div>
  );
}

function PromptDetails({ label, prompt }: { label: string; prompt: string }) {
  return (
    <details className="mt-2 rounded bg-zinc-950/60 border border-zinc-800 p-2">
      <summary className="text-xs text-zinc-400 cursor-pointer hover:text-zinc-200">
        📄 {label}（{prompt.length} 字）
      </summary>
      <pre className="mt-2 text-xs text-zinc-300 whitespace-pre-wrap max-h-96 overflow-auto">
        {prompt}
      </pre>
    </details>
  );
}
