import { CommitteeRolesPanel } from "invest-gui";

// RoleBrief (parseCommitteeMd.ts): { raw, signal, strength, oneLiner }.
// `raw` must be non-empty or the card renders the "未含此角色" degraded state.
// Local alias rather than importing the type — the synth-mode "invest-gui" entry
// only re-exports components, not lib types.
type RoleBrief = Parameters<typeof CommitteeRolesPanel>[0]["roles"]["macro"];

const mk = (
  signal: string | null,
  strength: number | null,
  oneLiner: string,
): RoleBrief => ({ raw: oneLiner, signal, strength, oneLiner });

// Bullish committee: macro risk_on, quant bullish, risk concerned, wealth strong.
const bullish = {
  macro: mk(
    "risk_on",
    7,
    "美联储暗示年内降息，流动性转松，科技股顺风。",
  ),
  quant: mk(
    "bullish",
    8,
    "NDQ.AX 站上 50 日均线，量能配合，回踩不破即多头。",
  ),
  risk: mk(
    "concerned",
    null,
    "单一资产占比已达 38%，集中度偏高，建议分批而非一次性加。",
  ),
  wealth: mk(
    "strong",
    null,
    "应急金 ¥4M + 家族支持，组合现金低不构成清仓理由。",
  ),
};

// Bearish committee: macro risk_off, quant bearish, risk high_risk, wealth moderate.
const bearish = {
  macro: mk(
    "risk_off",
    6,
    "通胀超预期，10 年期收益率快速上行，压制估值。",
  ),
  quant: mk(
    "bearish",
    7,
    "AAPL 跌破颈线，MACD 死叉，反弹乏力。",
  ),
  risk: mk(
    "high_risk",
    null,
    "回撤已逾 8%，触发减仓阈值，优先保住本金。",
  ),
  wealth: mk(
    "moderate",
    null,
    "可用流动性中等，留足 6 个月开支后再谈加仓。",
  ),
};

export const Bullish = () => (
  <div style={{ width: 880 }}>
    <CommitteeRolesPanel roles={bullish} />
  </div>
);

export const Bearish = () => (
  <div style={{ width: 880 }}>
    <CommitteeRolesPanel roles={bearish} />
  </div>
);
