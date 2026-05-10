import useSWR from "swr";
import { fetcher, type LlmSummaryResponse, type LlmUsageResponse } from "../../lib/api-client";
import { SWR_KEYS } from "../../lib/swr-keys";
import { shortTime } from "../../lib/format";

/**
 * CostTab — 本月 LLM 成本面板
 *
 * 数据来源：
 * - GET /api/llm/summary → 本月 input_tokens / output_tokens / cost_cny / call_count 汇总
 * - GET /api/llm/usage?since=30 → 最近 30 条调用明细（画折线趋势）
 *
 * 折线图用简单 SVG 实现，不引入 recharts 等大包（看现有组件没有 chart 库，保持一致）。
 * 当 since=30 数据量不足时，折线图降级显示"数据不足"提示。
 */

// ─── KPI 卡片 ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4">
      <div className="text-xs text-[var(--text-tertiary)]">{label}</div>
      <div className="text-xl font-bold mt-1 tabular-nums text-[var(--accent)]">{value}</div>
      {hint && <div className="text-xs text-[var(--text-tertiary)] mt-1">{hint}</div>}
    </div>
  );
}

// ─── 简单折线图（SVG）────────────────────────────────────────────────────────

/**
 * 用纯 SVG 画一条折线，X 轴是序号（时间），Y 轴是 cost_cny。
 * 不引入第三方 chart 库，保持 bundle 小。
 *
 * @param points 每个点的 {ts, cost_cny} 数据
 */
function CostLineChart({ points }: { points: Array<{ ts: string; cost_cny: number }> }) {
  if (points.length < 2) {
    return (
      <div className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6 text-center text-[var(--text-tertiary)] text-sm">
        数据不足（需 ≥2 条），等下次 LLM 调用后自动刷新
      </div>
    );
  }

  const W = 600;  // viewBox 宽
  const H = 120;  // viewBox 高
  const PAD = { top: 10, right: 20, bottom: 30, left: 50 };

  const n = points.length;
  const maxCost = Math.max(...points.map((p) => p.cost_cny), 0.0001);
  const minCost = Math.min(...points.map((p) => p.cost_cny), 0);

  const range = maxCost - minCost || 0.0001;

  // 坐标映射：序号 → X，cost → Y（SVG Y 轴向下）
  function toX(i: number) {
    return PAD.left + (i / (n - 1)) * (W - PAD.left - PAD.right);
  }
  function toY(cost: number) {
    return PAD.top + (1 - (cost - minCost) / range) * (H - PAD.top - PAD.bottom);
  }

  // 折线路径
  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(p.cost_cny).toFixed(1)}`)
    .join(" ");

  // 填充路径（折线下方到底部）
  const fillD =
    `${pathD} L ${toX(n - 1).toFixed(1)} ${(H - PAD.bottom).toFixed(1)} L ${PAD.left.toFixed(1)} ${(H - PAD.bottom).toFixed(1)} Z`;

  // Y 轴刻度（3 条）
  const yTicks = [minCost, (minCost + maxCost) / 2, maxCost];

  return (
    <div className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3">
      <p className="text-xs text-[var(--text-tertiary)] mb-2">
        最近 {n} 次 LLM 调用成本趋势（¥）
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: "120px" }}
        aria-label="LLM 成本折线图"
      >
        {/* Y 轴刻度线 */}
        {yTicks.map((v, i) => (
          <g key={i}>
            <line
              x1={PAD.left}
              y1={toY(v)}
              x2={W - PAD.right}
              y2={toY(v)}
              stroke="var(--border-subtle)"
              strokeWidth="0.5"
            />
            <text
              x={PAD.left - 4}
              y={toY(v) + 4}
              textAnchor="end"
              fontSize="9"
              fill="var(--text-tertiary)"
            >
              {v.toFixed(4)}
            </text>
          </g>
        ))}

        {/* X 轴底线 */}
        <line
          x1={PAD.left}
          y1={H - PAD.bottom}
          x2={W - PAD.right}
          y2={H - PAD.bottom}
          stroke="var(--border-subtle)"
          strokeWidth="1"
        />

        {/* 填充区 */}
        <path
          d={fillD}
          fill="var(--accent)"
          fillOpacity="0.08"
        />

        {/* 折线 */}
        <path
          d={pathD}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 最后一个点标注 */}
        <circle
          cx={toX(n - 1)}
          cy={toY(points[n - 1].cost_cny)}
          r="3"
          fill="var(--accent)"
        />

        {/* 首尾 X 轴时间标签 */}
        <text
          x={PAD.left}
          y={H - 4}
          fontSize="8"
          fill="var(--text-tertiary)"
          textAnchor="start"
        >
          {shortTime(points[0].ts)}
        </text>
        <text
          x={W - PAD.right}
          y={H - 4}
          fontSize="8"
          fill="var(--text-tertiary)"
          textAnchor="end"
        >
          {shortTime(points[n - 1].ts)}
        </text>
      </svg>
    </div>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────

export function CostTab() {
  // 本月汇总：input_tokens / output_tokens / cost_cny / call_count
  const { data: summary, isLoading: sumLoading } = useSWR<LlmSummaryResponse>(
    SWR_KEYS.LLM_SUMMARY,
    fetcher,
    { refreshInterval: 300_000 }, // 5 分钟刷新
  );

  // 最近 30 次调用明细（用于折线趋势）
  const { data: usage } = useSWR<LlmUsageResponse>(
    SWR_KEYS.llmUsage(30),
    fetcher,
    { refreshInterval: 300_000 },
  );

  if (sumLoading) {
    return <div className="text-[var(--text-secondary)]">加载中...</div>;
  }

  // 无数据状态
  if (!summary || summary.total_calls === 0) {
    return (
      <div className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6 text-center text-[var(--text-secondary)] space-y-2">
        <p>暂无 LLM 用量数据。</p>
        <p className="text-xs text-[var(--text-tertiary)]">
          每次委员会 / daily_report 跑后自动积累。下次 cron 触发是明天 10am，
          或手动 <code className="bg-[var(--surface-base)] px-1 rounded">/api/committee/run</code>。
        </p>
      </div>
    );
  }

  // 估算本月（按总量展示，后端 /api/llm/summary 含全量数据）
  const costCNY = summary.total_cost_cny;
  const inputTk = summary.total_input_tokens;
  const outputTk = summary.total_output_tokens;
  const calls = summary.total_calls;

  // 折线图数据：从 usage records 提取 ts + cost_cny，按时间升序
  const chartPoints = usage
    ? [...usage.records]
        .sort((a, b) => a.ts.localeCompare(b.ts))
        .map((r) => ({ ts: r.ts, cost_cny: r.cost_cny }))
    : [];

  return (
    <div className="space-y-6">
      {/* KPI 卡片区 */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="总调用次数"
          value={calls.toLocaleString()}
          hint="次"
        />
        <KpiCard
          label="估算成本"
          value={`¥${costCNY.toFixed(4)}`}
          hint="DeepSeek 计费，非实时精确"
        />
        <KpiCard
          label="输入 tokens"
          value={inputTk.toLocaleString()}
          hint="prompt 消耗"
        />
        <KpiCard
          label="输出 tokens"
          value={outputTk.toLocaleString()}
          hint="completion 生成"
        />
      </div>

      {/* 成本趋势折线图 */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
          成本趋势（最近 30 次调用）
        </h3>
        <CostLineChart points={chartPoints} />
      </section>

      {/* 按角色拆分（复用 summary.by_role） */}
      {Object.keys(summary.by_role).length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
            按 Agent 角色拆分
          </h3>
          <div className="border border-[var(--border-subtle)] overflow-x-auto">
            <table className="w-full text-sm tabular-nums min-w-[480px]">
              <thead className="bg-[var(--surface-raised)] text-[var(--text-secondary)] text-xs">
                <tr>
                  <th className="px-3 py-2 text-left">角色</th>
                  <th className="px-3 py-2 text-right">调用</th>
                  <th className="px-3 py-2 text-right">input tk</th>
                  <th className="px-3 py-2 text-right">output tk</th>
                  <th className="px-3 py-2 text-right">成本 ¥</th>
                  <th className="px-3 py-2 text-right">avg latency</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(summary.by_role).map(([role, stats]) => (
                  <tr key={role} className="border-t border-[var(--border-subtle)]">
                    <td className="px-3 py-2 font-mono text-xs text-[var(--text-secondary)]">
                      {role}
                    </td>
                    <td className="px-3 py-2 text-right text-[var(--text-primary)]">
                      {stats.calls}
                    </td>
                    <td className="px-3 py-2 text-right text-[var(--text-secondary)]">
                      {stats.input_tokens.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-[var(--text-secondary)]">
                      {stats.output_tokens.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-[var(--accent)]">
                      {stats.cost_cny.toFixed(4)}
                    </td>
                    <td className="px-3 py-2 text-right text-[var(--text-tertiary)]">
                      {stats.avg_latency_ms} ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 价格参考说明 */}
      <div className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3 text-xs text-[var(--text-tertiary)] space-y-1">
        <p className="font-semibold text-[var(--text-primary)]">计费参考</p>
        <p>DeepSeek-V3：输入 ¥0.0007/1K tokens，输出 ¥0.0028/1K tokens（cache 命中约半价）。</p>
        <p>估算值仅供参考，实际账单以 DeepSeek 控制台为准。</p>
      </div>
    </div>
  );
}
