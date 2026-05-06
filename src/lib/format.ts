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
