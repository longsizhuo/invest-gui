/** 数字格式化工具 */

export function formatCNY(value: number | null | undefined): string {
  if (value == null) return "—";
  return `¥${value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatAUD(value: number | null | undefined): string {
  if (value == null) return "—";
  return `A$${value.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatGrams(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value.toFixed(4)}g`;
}

export function formatPct(value: number | null | undefined, fractionDigits = 2): string {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(fractionDigits)}%`;
}

/** ISO 时间戳缩短到 YYYY-MM-DD HH:MM */
export function shortTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return iso.slice(0, 16).replace("T", " ");
}

/** ISO 时间戳精确到秒 YYYY-MM-DD HH:MM:SS */
export function preciseTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return iso.slice(0, 19).replace("T", " ");
}

/** 两个 ISO 时间戳的差值（毫秒精度），返回人类可读 "12.3s" / "1m 45s" */
export function durationBetween(
  startIso: string | null | undefined,
  endIso: string | null | undefined,
): string {
  if (!startIso || !endIso) return "—";
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (Number.isNaN(ms) || ms < 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(1)}s`;
  const min = Math.floor(sec / 60);
  const remSec = Math.round(sec - min * 60);
  return `${min}m ${remSec}s`;
}

/**
 * verdict 翻成中文动作行
 *
 * 修 Tester 一票否决：英文缩写（TRIM/HOLD/SELL）扔在 UI 上没有解释，
 * 用户答不出"AI 让我做什么"。翻成中文 + 金额数字 + 语义色。
 *
 * 用在 DashboardHero / HistoryTab 等多处。
 */
export type VerdictTone = "pos" | "neg" | "warn" | "neutral";

export function verdictAction(
  verdict: string | null | undefined,
  allocCNY: number | null | undefined,
): { action: string; tone: VerdictTone } {
  if (!verdict) return { action: "—", tone: "neutral" };
  const amount =
    allocCNY != null && allocCNY !== 0
      ? `¥${Math.abs(allocCNY).toLocaleString()}`
      : "";
  switch (verdict.toUpperCase()) {
    case "BUY":
      return { action: amount ? `建议买入 ${amount}` : "建议买入", tone: "pos" };
    case "ACCUMULATE":
      return { action: amount ? `分批加仓 ${amount}` : "分批加仓", tone: "pos" };
    case "HOLD":
      return { action: "维持不动", tone: "neutral" };
    case "TRIM":
      return { action: amount ? `建议减仓 ${amount}` : "建议减仓", tone: "warn" };
    case "SELL":
      return { action: amount ? `建议卖出 ${amount}` : "建议卖出", tone: "neg" };
    default:
      return { action: verdict, tone: "neutral" };
  }
}
