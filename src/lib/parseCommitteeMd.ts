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

export interface ParsedCommittee {
  /** 6 段内容，按 pipeline 顺序：macro → quant_r1 → risk_r1 → quant_r2 → risk_r2 → cio */
  sections: {
    macro: string;
    quant_r1: string;
    risk_r1: string;
    quant_r2: string;
    risk_r2: string;
    cio: string;
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
  quantR1: /### Quant Analyst\s*\n+([\s\S]*?)(?=\n###\s|\n##\s|$)/,
  riskR1: /### Risk Officer\s*\n+([\s\S]*?)(?=\n###\s|\n##\s|$)/,
  quantR2: /### Quant adjusted[^\n]*\n+([\s\S]*?)(?=\n###\s|\n##\s|$)/,
  riskR2: /### Risk adjusted[^\n]*\n+([\s\S]*?)(?=\n###\s|\n##\s|$)/,
};

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

  return {
    sections: {
      macro: grab(SECTION_PATTERNS.macro),
      quant_r1: grab(SECTION_PATTERNS.quantR1),
      risk_r1: grab(SECTION_PATTERNS.riskR1),
      quant_r2: grab(SECTION_PATTERNS.quantR2),
      risk_r2: grab(SECTION_PATTERNS.riskR2),
      cio: grab(SECTION_PATTERNS.cio),
    },
    macroSnapshot,
    verdict: verdictMatch?.[1] ?? null,
    confidence: verdictMatch?.[2] ? parseFloat(verdictMatch[2]) : null,
    dominantView: dominantMatch?.[1] ?? null,
    suggestedAlloc: allocMatch?.[1] ? parseFloat(allocMatch[1]) : null,
  };
}
