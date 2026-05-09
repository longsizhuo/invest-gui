import { useState } from "react";
import useSWR from "swr";
import {
  fetcher,
  type CommitteeSessionsResponse,
  type CommitteeSessionDetail,
} from "../../lib/api-client";
import { VerdictBadge } from "../../components/StatusBadge";
import { verdictAction } from "../../lib/format";

/**
 * Committee · 决议历史归档
 *
 * 左：所有 memory/.committee/<date>/<symbol>.md 列表
 * 右：选中行的完整 markdown body
 *
 * 和 AccuracyTab 区别：
 * - History 是单条决议的详细文档
 * - Accuracy 是聚合的命中率统计
 */
export function HistoryTab() {
  const { data, error, isLoading } = useSWR<CommitteeSessionsResponse>(
    "/api/committee_sessions?limit=100",
    fetcher,
  );
  const [selected, setSelected] = useState<{ date: string; symbol: string } | null>(null);

  if (isLoading)
    return <div className="text-[var(--text-secondary)]">加载中…</div>;
  if (error) return <div className="text-neg">失败: {error.message}</div>;
  if (!data) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div>
        <p className="text-xs text-[var(--text-tertiary)] mb-2 font-mono">
          共 {data.count} 个历史决议 · 点击看完整 memo
        </p>
        <div className="border border-[var(--border-subtle)] overflow-hidden max-h-[70vh] overflow-y-auto">
          <table className="w-full text-xs tabular-nums">
            <thead className="bg-[var(--surface-raised)] text-[var(--text-tertiary)] sticky top-0">
              <tr>
                <th className="px-2 py-1.5 text-left font-medium">日期</th>
                <th className="px-2 py-1.5 text-left font-medium">资产</th>
                <th className="px-2 py-1.5 text-left font-medium">verdict</th>
                <th className="px-2 py-1.5 text-right font-medium">conf</th>
                <th className="px-2 py-1.5 text-right font-medium">建议 ¥</th>
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
                    className={`border-t border-[var(--border-subtle)] cursor-pointer hover:bg-[var(--surface-raised)] ${
                      isActive ? "bg-[var(--surface-overlay)]" : ""
                    }`}
                  >
                    <td className="px-2 py-1 text-[var(--text-secondary)] font-mono">
                      {s.date}
                    </td>
                    <td className="px-2 py-1 font-mono text-[var(--text-primary)]">
                      {s.symbol}
                    </td>
                    <td className="px-2 py-1">
                      <VerdictBadge verdict={s.verdict ?? null} />
                    </td>
                    <td className="px-2 py-1 text-right text-[var(--text-secondary)] font-mono">
                      {s.confidence ?? "—"}
                    </td>
                    <td
                      className={`px-2 py-1 text-right font-mono ${
                        s.suggested_alloc_cny == null
                          ? "text-[var(--text-tertiary)]"
                          : s.suggested_alloc_cny > 0
                            ? "text-pos"
                            : s.suggested_alloc_cny < 0
                              ? "text-neg"
                              : "text-[var(--text-primary)]"
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
          <div className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6 text-center text-[var(--text-tertiary)]">
            点击左侧任意决议看完整 markdown
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 把 committee markdown 拆成结构化展示
 *
 * 之前是 `<pre>` 全文 dump，用户反馈"一堆代码和结果混在一起"。改成：
 * - 顶部大字 verdict + chip + alloc + dominant view
 * - PERSONAL_NOTE 卡片（最重要的结论，给人看的话）
 * - EXECUTION_PLAN / RISK_PLAN 折叠展开
 * - Macro / Quant / Risk 各自折叠（默认展开 macro，其他默认收）
 * - 完整 markdown 仍可以"查看原文"
 */
function CommitteeDetail({ date, symbol }: { date: string; symbol: string }) {
  const { data } = useSWR<CommitteeSessionDetail>(
    `/api/committee_sessions/${encodeURIComponent(date)}/${encodeURIComponent(symbol)}`,
    fetcher,
  );
  if (!data)
    return <div className="text-[var(--text-tertiary)]">加载…</div>;

  const parsed = parseCommitteeMarkdown(data.content);

  // F2: 中文动作行（"建议减仓 ¥15,000"）—— Tester 一票否决：英文 TRIM 看不懂
  const { action, tone } = verdictAction(parsed.verdict, parsed.allocCNY);
  const toneClass = {
    pos: "text-pos",
    neg: "text-neg",
    warn: "text-warn",
    neutral: "text-[var(--text-primary)]",
  }[tone];

  return (
    <div className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] max-h-[70vh] overflow-y-auto">
      {/* 顶部 verdict landmark —— 进来第一眼就能看清"AI 让我做什么" */}
      <header className="p-5 border-b border-[var(--border-subtle)]">
        {/* 第一行：日期 + symbol 上下文（PM-2: 用户问"这是多久前的建议"）*/}
        <p className="text-xs text-[var(--text-tertiary)] font-mono mb-3 uppercase tracking-wider">
          {date} · {symbol}
        </p>
        {/* 第二行：中文动作 + 金额（Tester 否决项的核心修复）*/}
        <p className={`font-display text-3xl mb-2 ${toneClass}`}>{action}</p>
        {/* 第三行：原始 verdict 缩写 + 置信度（次要信息，给追根究底的）*/}
        <p className="text-xs text-[var(--text-tertiary)] font-mono">
          原始 verdict: {parsed.verdict ?? "—"}
          {parsed.confidence != null &&
            ` · 置信 ${(parsed.confidence * 100).toFixed(0)}%`}
        </p>
      </header>

      {/* PERSONAL_NOTE —— 给用户的人话总结 */}
      {parsed.personalNote.length > 0 && (
        <section className="p-5 border-b border-[var(--border-subtle)]">
          <h4 className="text-xs uppercase tracking-widest text-[var(--text-tertiary)] mb-3">
            给你的话
          </h4>
          <ul className="space-y-2">
            {parsed.personalNote.map((line, i) => (
              <li
                key={i}
                className="text-sm text-[var(--text-primary)] leading-relaxed pl-4 border-l-2 border-[var(--border-subtle)]"
              >
                {line.replace(/^[-•]\s*/, "")}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 执行 / 风险计划 —— **默认折叠**（F3 修 Tester 否决：mode: none 是机器格式，
          展开占第一屏 = 噪音，让 PERSONAL_NOTE 占第一屏；想看明细的点开展开）*/}
      {(parsed.executionPlan || parsed.riskPlan) && (
        <section className="p-5 border-b border-[var(--border-subtle)] space-y-2">
          {parsed.executionPlan && (
            <details className="border border-[var(--border-subtle)] bg-[var(--surface-base)]">
              <summary className="px-3 py-2 cursor-pointer text-sm text-[var(--text-primary)] hover:bg-[var(--surface-overlay)]">
                执行计划（点开看 mode / first_tranche / add_levels）
              </summary>
              <pre className="px-3 pb-3 text-xs text-[var(--text-secondary)] whitespace-pre-wrap font-mono leading-relaxed">
                {parsed.executionPlan.trim()}
              </pre>
            </details>
          )}
          {parsed.riskPlan && (
            <details className="border border-[var(--border-subtle)] bg-[var(--surface-base)]">
              <summary className="px-3 py-2 cursor-pointer text-sm text-[var(--text-primary)] hover:bg-[var(--surface-overlay)]">
                风险计划（止损触发条件 / 最坏 PnL）
              </summary>
              <pre className="px-3 pb-3 text-xs text-[var(--text-secondary)] whitespace-pre-wrap font-mono leading-relaxed">
                {parsed.riskPlan.trim()}
              </pre>
            </details>
          )}
        </section>
      )}

      {/* 4 角色辩论原文 —— 默认折叠（给想看推理的） */}
      {parsed.sections.length > 0 && (
        <section className="p-5 border-b border-[var(--border-subtle)]">
          <h4 className="text-xs uppercase tracking-widest text-[var(--text-tertiary)] mb-3">
            完整辩论 transcript
          </h4>
          <div className="space-y-2">
            {parsed.sections.map((s, i) => (
              <details
                key={i}
                className="border border-[var(--border-subtle)] bg-[var(--surface-base)]"
              >
                <summary className="px-3 py-2 cursor-pointer text-sm text-[var(--text-primary)] hover:bg-[var(--surface-overlay)]">
                  {s.title}
                </summary>
                <pre className="px-3 pb-3 text-xs text-[var(--text-secondary)] whitespace-pre-wrap font-mono leading-relaxed">
                  {s.body.trim()}
                </pre>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* 兜底：原始 markdown （给真要看 raw 的人）*/}
      <details className="p-5">
        <summary className="cursor-pointer text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
          查看原始 markdown
        </summary>
        <pre className="mt-3 text-xs text-[var(--text-tertiary)] whitespace-pre-wrap font-mono">
          {data.content}
        </pre>
      </details>
    </div>
  );
}

/**
 * 极简 markdown 解析 —— 只抓 committee 文档里固定 schema 的字段
 *
 * 输入示例：
 *   # Committee: BetaShares Nasdaq 100 ETF
 *   **Verdict**: HOLD (confidence 0.75)
 *   **Dominant view**: risk
 *   **Suggested allocation CNY**: 0
 *   ## CIO Memo (Round 3)
 *   VERDICT: HOLD
 *   ...
 *   PERSONAL_NOTE:
 *     - line 1
 *     - line 2
 *   ## Macro Strategist (shared)
 *   ...
 *
 * 不引 markdown-it 之类的库——schema 固定，正则就够。
 */
type Parsed = {
  verdict: string | null;
  confidence: number | null;
  dominantView: string | null;
  allocCNY: number | null;
  personalNote: string[];
  executionPlan: string | null;
  riskPlan: string | null;
  sections: { title: string; body: string }[];
};

function parseCommitteeMarkdown(md: string): Parsed {
  const out: Parsed = {
    verdict: null,
    confidence: null,
    dominantView: null,
    allocCNY: null,
    personalNote: [],
    executionPlan: null,
    riskPlan: null,
    sections: [],
  };

  // 顶部 frontmatter 行
  const verdictLine = md.match(/\*\*Verdict\*\*:\s*([A-Z_]+)\s*(?:\(confidence\s*([\d.]+)\))?/);
  if (verdictLine) {
    out.verdict = verdictLine[1];
    if (verdictLine[2]) out.confidence = parseFloat(verdictLine[2]);
  }
  const dom = md.match(/\*\*Dominant view\*\*:\s*([a-z]+)/i);
  if (dom) out.dominantView = dom[1];
  const alloc = md.match(/\*\*Suggested allocation CNY\*\*:\s*(-?\d+)/);
  if (alloc) out.allocCNY = parseInt(alloc[1], 10);

  // CIO Memo 段里的 EXECUTION_PLAN / RISK_PLAN / PERSONAL_NOTE
  // 用 [\s\S] 跨多行匹配（JS 没 dotall 标志默认）
  //
  // F4 修 Dev-1 P0：旧 lookahead `\n\n[A-Z_]+:` 要求**双换行**才停。LLM 偶尔
  // 输出单换行分隔时，EXECUTION_PLAN 会一路吞掉 RISK_PLAN + PERSONAL_NOTE
  // 全部内容直到 EOF。改成显式 ALL_CAPS 字段名 lookahead 不依赖空行数量。
  const NEXT_FIELD = /\n(?:RISK_PLAN|PERSONAL_NOTE|EXECUTION_PLAN|VERDICT|CONFIDENCE|DOMINANT_VIEW|SUGGESTED_ALLOC_CNY):|\n##\s|\n---\s*\n|$/;
  const execMatch = md.match(
    new RegExp(`EXECUTION_PLAN:\\s*([\\s\\S]*?)(?=${NEXT_FIELD.source})`),
  );
  if (execMatch) out.executionPlan = execMatch[1];
  const riskMatch = md.match(
    new RegExp(`RISK_PLAN:\\s*([\\s\\S]*?)(?=${NEXT_FIELD.source})`),
  );
  if (riskMatch) out.riskPlan = riskMatch[1];

  const noteMatch = md.match(
    new RegExp(`PERSONAL_NOTE:\\s*([\\s\\S]*?)(?=${NEXT_FIELD.source})`),
  );
  if (noteMatch) {
    out.personalNote = noteMatch[1]
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("-") || l.startsWith("•"))
      .map((l) => l.replace(/^[-•]\s*/, ""))
      .filter((l) => l.length > 0);
  }

  // 角色 transcript：## Macro Strategist / ## Round 1 ... 的 H2 区块
  // 跳过已经单独提取的 ## CIO Memo（避免重复展示）
  const sectionRe = /\n##\s+([^\n]+)\n([\s\S]*?)(?=\n##\s+|$)/g;
  let m: RegExpExecArray | null;
  while ((m = sectionRe.exec(md)) !== null) {
    const title = m[1].trim();
    const body = m[2];
    if (/^CIO\s*Memo/i.test(title)) continue; // CIO 已结构化展示，不重复
    if (/Macro Context Snapshot/i.test(title)) continue; // 顶部 JSON 不展示
    out.sections.push({ title, body });
  }

  return out;
}
