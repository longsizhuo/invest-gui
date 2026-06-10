/**
 * 解析委员会 markdown 文件提取 6 段内容
 *
 * markdown 结构（来自 core/committee.py 落盘）：
 *   # Committee: <name>
 *   **Verdict**: ...
 *
 *   ## Macro Context Snapshot
 *   ```json {...} ```
 *
 *   ## CIO Memo (Round 3)
 *   <CIO 文本>
 *
 *   ## Macro Strategist (shared)
 *   <macro 文本>
 *
 *   ## Round 1 — Independent Briefs
 *   ### Quant Analyst
 *   <text>
 *   ### Risk Officer
 *   <text>
 *
 *   ## Round 2 — Cross-Challenge Adjustments
 *   ### Quant adjusted
 *   <text>
 *   ### Risk adjusted
 *   <text>
 */

/** 单个角色的结构化 brief —— 让前端能展示"badge + ONE_LINER"卡片 */
export interface RoleBrief {
  /** 角色原始 markdown 段落 */
  raw: string;
  /** 主信号：宏观 risk_on/off/neutral；技术 bullish/bearish/neutral；风控 ok/concerned/high_risk；
   * 流动性 strong/moderate/weak/unknown */
  signal: string | null;
  /** 信号强度 0-10（部分角色用，Wealth 角色用 SOLVENCY_BUFFER_LEVEL 替代）*/
  strength: number | null;
  /** 一句话结论（给 GUI 卡片副标题）*/
  oneLiner: string | null;
}

export interface ParsedCommittee {
  /** 6 段内容，按 pipeline 顺序：macro → quant_r1 → risk_r1 → quant_r2 → risk_r2 → cio */
  sections: {
    macro: string;
    quant_r1: string;
    risk_r1: string;
    quant_r2: string;
    risk_r2: string;
    cio: string;
    /** 第 5 角色 WealthContextOfficer（real liquidity）—— 后端 d5b1e9f 引入 */
    wealth_context: string;
    /** 确定性事实块（后端 v0.6.0 引入，非 LLM 输出）：估值（仅权益类非空） */
    valuation: string;
    /** 确定性事实块：市场情绪表盘（VIX 分位 + CNN + EVENT_STANCE + INDEP_DEFENSE_FLAG） */
    sentiment: string;
  };
  /** 结构化角色 brief（给 4 角色 panel 用，不含 Round 2 adjusted）*/
  roles: {
    macro: RoleBrief;
    quant: RoleBrief;
    risk: RoleBrief;
    wealth: RoleBrief;
  };
  macroSnapshot: Record<string, unknown> | null;
  verdict: string | null;
  confidence: number | null;
  dominantView: string | null;
  suggestedAlloc: number | null;
}

const SECTION_PATTERNS = {
  macroSnapshot: /## Macro Context Snapshot\s*\n+```json\s*\n([\s\S]+?)\n```/,
  cio: /## CIO Memo[^\n]*\n+([\s\S]*?)(?=\n##\s|$)/,
  macro: /## Macro Strategist[^\n]*\n+([\s\S]*?)(?=\n##\s|\n###\s|$)/,
  wealth: /## Wealth Context Officer[^\n]*\n+([\s\S]*?)(?=\n##\s|\n###\s|$)/,
  quantR1: /### Quant Analyst\s*\n+([\s\S]*?)(?=\n###\s|\n##\s|$)/,
  riskR1: /### Risk Officer\s*\n+([\s\S]*?)(?=\n###\s|\n##\s|$)/,
  quantR2: /### Quant adjusted[^\n]*\n+([\s\S]*?)(?=\n###\s|\n##\s|$)/,
  riskR2: /### Risk adjusted[^\n]*\n+([\s\S]*?)(?=\n###\s|\n##\s|$)/,
  // 确定性事实块（后端 core/committee.py _persist，v0.6.0+）。--- 分隔线夹在段间，
  // 终止条件加 \n---，否则会把下一段吞进来
  valuation: /## Valuation \(deterministic\)\s*\n+([\s\S]*?)(?=\n---|\n##\s|$)/,
  sentiment: /## Market Sentiment \(deterministic\)\s*\n+([\s\S]*?)(?=\n---|\n##\s|$)/,
};

/**
 * 从角色 markdown 段抽 SIGNAL / STRENGTH / ONE_LINER。
 * Wealth 角色用 SOLVENCY_BUFFER_LEVEL 当 signal（没有 STRENGTH 字段）。
 */
function extractRoleBrief(raw: string, kind: "macro" | "quant" | "risk" | "wealth"): RoleBrief {
  if (!raw) {
    return { raw: "", signal: null, strength: null, oneLiner: null };
  }
  const signalKey = kind === "wealth" ? "SOLVENCY_BUFFER_LEVEL" : "SIGNAL";
  const signalMatch = raw.match(new RegExp(`${signalKey}:\\s*([^\\n]+)`));
  const strengthMatch = raw.match(/STRENGTH:\s*(\d+)/);
  // Wealth 角色用 EXPLANATION_TO_CIO 当 ONE_LINER；其他用 ONE_LINER
  const linerKey = kind === "wealth" ? "EXPLANATION_TO_CIO" : "ONE_LINER";
  const linerMatch = raw.match(new RegExp(`${linerKey}:\\s*([^\\n]+)`));
  return {
    raw,
    signal: signalMatch?.[1]?.trim() ?? null,
    strength: strengthMatch?.[1] ? parseInt(strengthMatch[1], 10) : null,
    oneLiner: linerMatch?.[1]?.trim() ?? null,
  };
}

export function parseCommitteeMd(content: string): ParsedCommittee {
  const grab = (pattern: RegExp): string => {
    const m = content.match(pattern);
    return m?.[1]?.trim() ?? "";
  };

  let macroSnapshot: Record<string, unknown> | null = null;
  const snapMatch = content.match(SECTION_PATTERNS.macroSnapshot);
  if (snapMatch) {
    try {
      macroSnapshot = JSON.parse(snapMatch[1]);
    } catch {
      macroSnapshot = null;
    }
  }

  // header verdict
  const verdictMatch = content.match(/\*\*Verdict\*\*:\s*(\w+)\s*\(confidence\s*([\d.]+)\)/);
  const dominantMatch = content.match(/\*\*Dominant view\*\*:\s*(\w+)/);
  const allocMatch = content.match(/\*\*Suggested allocation CNY\*\*:\s*(-?[\d.]+)/);

  const macroRaw = grab(SECTION_PATTERNS.macro);
  const quantR1Raw = grab(SECTION_PATTERNS.quantR1);
  const riskR1Raw = grab(SECTION_PATTERNS.riskR1);
  const wealthRaw = grab(SECTION_PATTERNS.wealth);

  return {
    sections: {
      macro: macroRaw,
      quant_r1: quantR1Raw,
      risk_r1: riskR1Raw,
      quant_r2: grab(SECTION_PATTERNS.quantR2),
      risk_r2: grab(SECTION_PATTERNS.riskR2),
      cio: grab(SECTION_PATTERNS.cio),
      wealth_context: wealthRaw,
      valuation: grab(SECTION_PATTERNS.valuation),
      sentiment: grab(SECTION_PATTERNS.sentiment),
    },
    roles: {
      macro: extractRoleBrief(macroRaw, "macro"),
      quant: extractRoleBrief(quantR1Raw, "quant"),
      risk: extractRoleBrief(riskR1Raw, "risk"),
      wealth: extractRoleBrief(wealthRaw, "wealth"),
    },
    macroSnapshot,
    verdict: verdictMatch?.[1] ?? null,
    confidence: verdictMatch?.[2] ? parseFloat(verdictMatch[2]) : null,
    dominantView: dominantMatch?.[1] ?? null,
    suggestedAlloc: allocMatch?.[1] ? parseFloat(allocMatch[1]) : null,
  };
}
