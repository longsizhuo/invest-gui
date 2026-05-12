/**
 * 4 角色独立 panel —— 让用户一眼看清委员会内部 4 个 LLM 各自的判断
 *
 * 之前所有非 CIO 段落都堆在"完整辩论 transcript"折叠区，用户看不出"风控为什么 NO，
 * 宏观为什么 YES"的对比。这是 openInvest 产品差异化的核心展示（4 个独立 LLM
 * cross-challenge 而非塞 1 个 prompt 多人格），不展示出来等于浪费。
 */
import type { RoleBrief } from "../lib/parseCommitteeMd";

type RoleKind = "macro" | "quant" | "risk" | "wealth";

const ROLE_META: Record<RoleKind, { label: string; emoji: string; subtitle: string }> = {
  macro: { label: "宏观", emoji: "🌍", subtitle: "Macro Strategist" },
  quant: { label: "技术", emoji: "📊", subtitle: "Quant Analyst" },
  risk: { label: "风控", emoji: "⚠️", subtitle: "Risk Officer" },
  wealth: { label: "流动性", emoji: "💰", subtitle: "Wealth Context" },
};

/** SIGNAL 颜色：正向（risk_on/bullish/ok/strong）绿；负向（risk_off/bearish/high_risk/weak）红；
 *  中性（neutral/concerned/moderate）橙；unknown 灰。*/
function signalTone(signal: string | null): "good" | "warn" | "bad" | "muted" {
  if (!signal) return "muted";
  const s = signal.toLowerCase();
  if (["risk_on", "bullish", "ok", "strong"].includes(s)) return "good";
  if (["risk_off", "bearish", "high_risk", "weak"].includes(s)) return "bad";
  if (["neutral", "concerned", "moderate"].includes(s)) return "warn";
  return "muted";
}

const TONE_CLASSES: Record<"good" | "warn" | "bad" | "muted", string> = {
  good: "bg-[color:rgba(76,175,80,0.12)] text-[color:rgb(120,200,120)] border-[color:rgba(76,175,80,0.3)]",
  warn: "bg-[color:rgba(255,167,38,0.12)] text-[color:rgb(255,180,80)] border-[color:rgba(255,167,38,0.3)]",
  bad: "bg-[color:rgba(229,57,53,0.12)] text-[color:rgb(255,120,120)] border-[color:rgba(229,57,53,0.3)]",
  muted: "bg-[var(--surface-base)] text-[var(--text-tertiary)] border-[var(--border-strong)]",
};

function RoleCard({ kind, brief }: { kind: RoleKind; brief: RoleBrief }) {
  const meta = ROLE_META[kind];
  const tone = signalTone(brief.signal);
  const hasContent = brief.raw.length > 0;

  if (!hasContent) {
    // 兼容旧 transcript（WealthContextOfficer 在后端落盘前的 verdict 没这段）
    return (
      <div className="border border-[var(--border-subtle)] p-4 opacity-50">
        <div className="flex items-center gap-2 mb-2">
          <span aria-hidden>{meta.emoji}</span>
          <h3 className="font-semibold text-sm">{meta.label}</h3>
        </div>
        <p className="text-xs text-[var(--text-tertiary)]">(该 verdict 未含此角色)</p>
      </div>
    );
  }

  return (
    <div className="border border-[var(--border-strong)] p-4 flex flex-col gap-2">
      {/* 角色标题 */}
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-base">{meta.emoji}</span>
          <h3 className="font-semibold text-sm">{meta.label}</h3>
        </div>
        <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide">
          {meta.subtitle}
        </span>
      </div>

      {/* SIGNAL badge + STRENGTH（如有）*/}
      <div className="flex items-center gap-2">
        <span
          className={`inline-block px-2 py-0.5 text-xs font-mono border ${TONE_CLASSES[tone]}`}
        >
          {brief.signal ?? "—"}
        </span>
        {brief.strength !== null && (
          <span className="text-xs text-[var(--text-tertiary)] font-mono tabular-nums">
            强度 {brief.strength}/10
          </span>
        )}
      </div>

      {/* ONE_LINER 一句话结论 */}
      {brief.oneLiner && (
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-1">
          {brief.oneLiner}
        </p>
      )}
    </div>
  );
}

export function CommitteeRolesPanel({
  roles,
}: {
  roles: {
    macro: RoleBrief;
    quant: RoleBrief;
    risk: RoleBrief;
    wealth: RoleBrief;
  };
}) {
  return (
    <div className="space-y-2">
      <header>
        <h2 className="text-xs uppercase tracking-wide text-[var(--text-tertiary)] mb-2">
          4 角色独立 brief（CIO 综合前）
        </h2>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <RoleCard kind="macro" brief={roles.macro} />
        <RoleCard kind="quant" brief={roles.quant} />
        <RoleCard kind="risk" brief={roles.risk} />
        <RoleCard kind="wealth" brief={roles.wealth} />
      </div>
    </div>
  );
}
