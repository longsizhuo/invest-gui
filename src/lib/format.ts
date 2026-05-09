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
 * phase 机器字符串 → 中文标签映射
 *
 * 来源：core/committee.py emit() + connectors/web_api.py on_progress()
 *       + jobs/dreaming.py + jobs/daily_report.py
 * 用于 PipelineTab / System.tsx 的事件流展示，避免裸渲染机器字符串。
 */
const PHASE_LABELS: Record<string, string> = {
  // 委员会主流程（committee.py emit）
  round_1_start: "Round 1 开始",
  round_1_done: "Round 1 完成",
  converged: "提前收敛",
  cio_start: "CIO 决策中",
  cio_done: "CIO 决策完成",
  committee_finished: "委员会完成",
  committee_finished_skill: "委员会完成（Skill）",
  // 多资产并行（web_api.py on_progress）
  macro_start: "宏观分析中",
  macro_done: "宏观分析完成",
  queued: "已排队",
  done: "完成",
  error: "出错",
  // Dreaming 睡眠阶段（jobs/dreaming.py）
  light_sleep: "轻睡眠（信号收集）",
  rem_sleep: "REM 睡眠（候选生成）",
  deep_sleep: "深睡眠（洞察固化）",
  deep_sleep_llm_verify: "深睡眠 LLM 验证",
  start: "开始",
  end: "结束",
  // 日报错误（jobs/daily_report.py）
  price_fetch_failed: "行情拉取失败",
  price_stale: "行情数据过期",
  gold_price_stale_fallback: "金价回退（离线）",
  daily_report_aborted_stale: "日报中止（数据过期）",
  email_delivery_failed: "邮件发送失败",
};

/**
 * phase 字符串翻译为可读中文标签
 *
 * - 已知 phase → 中文
 * - round_N_start / round_N_done → "Round N 开始 / 完成"
 * - 未知 phase → 原样返回（不抛错）
 */
export function labelPhase(phase: string): string {
  if (PHASE_LABELS[phase]) return PHASE_LABELS[phase];
  const m = phase.match(/^round_(\d+)_(start|done)$/);
  if (m) return `Round ${m[1]} ${m[2] === "start" ? "开始" : "完成"}`;
  return phase;
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
