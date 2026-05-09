/**
 * API client：fetch 包装 + SWR fetcher
 *
 * 部署假设：前端和后端同源（生产 Caddy 反代 /api/* → 127.0.0.1:8765；
 * 开发 Vite proxy 同效）。所以这里直接用相对路径，不带 host。
 *
 * 鉴权：CF Access cookie 由浏览器自动带（同域），代码无需关心。
 */
import type { components } from "./api-types";

export type Portfolio = components["schemas"]["PortfolioResponse"];
export type Strategy = components["schemas"]["StrategyResponse"];
export type TargetAsset = components["schemas"]["TargetAsset"];
export type GoldHolding = components["schemas"]["GoldHolding"];
export type NDQHolding = components["schemas"]["NDQHolding"];
export type HistoryResponse = components["schemas"]["HistoryResponse"];
export type HistoryRow = components["schemas"]["HistoryRow"];
export type DailyResponse = components["schemas"]["DailyResponse"];
export type DepositRequest = components["schemas"]["DepositRequest"];
export type WithdrawRequest = components["schemas"]["WithdrawRequest"];
export type GoldTradeRequest = components["schemas"]["GoldTradeRequest"];
export type GoldOffsetRequest = components["schemas"]["GoldOffsetRequest"];
export type GoldSetRequest = components["schemas"]["GoldSetRequest"];
export type WriteResponse = components["schemas"]["WriteResponse"];
export type CommitteeRunResponse = components["schemas"]["CommitteeRunResponse"];
export type CommitteeStatusResponse = components["schemas"]["CommitteeStatusResponse"];
export type AllocationsRequest = components["schemas"]["AllocationsRequest"];
export type TargetAssetCreate = components["schemas"]["TargetAssetCreate"];
export type TargetAssetPatch = components["schemas"]["TargetAssetPatch"];
export type StrategyWriteResponse = components["schemas"]["StrategyWriteResponse"];

// v2 通用化类型
export type HoldingV2 = components["schemas"]["HoldingV2"];
export type HoldingQuote = components["schemas"]["HoldingQuote"];
export type HoldingsListResponse = components["schemas"]["HoldingsListResponse"];

// 系统/原理可视化（v2 + v3）
export type JobStatus = components["schemas"]["JobStatus"];
export type JobsStatusResponse = components["schemas"]["JobsStatusResponse"];
export type InsightItem = components["schemas"]["InsightItem"];
export type InsightsResponse = components["schemas"]["InsightsResponse"];
export type RegimeResponse = components["schemas"]["RegimeResponse"];
export type DreamEvent = components["schemas"]["DreamEvent"];
export type DreamsStateResponse = components["schemas"]["DreamsStateResponse"];
export type PnLHistoryPoint = components["schemas"]["PnLHistoryPoint"];
export type PnLHistoryResponse = components["schemas"]["PnLHistoryResponse"];
export type CommitteeSessionSummary = components["schemas"]["CommitteeSessionSummary"];
export type CommitteeSessionsResponse = components["schemas"]["CommitteeSessionsResponse"];
export type CommitteeSessionDetail = components["schemas"]["CommitteeSessionDetail"];

// v3 透明化新增
export type LlmUsageRecord = components["schemas"]["LlmUsageRecord"];
export type LlmUsageResponse = components["schemas"]["LlmUsageResponse"];
export type LlmRoleStats = components["schemas"]["LlmRoleStats"];
export type LlmSummaryResponse = components["schemas"]["LlmSummaryResponse"];
export type ToolCallRecord = components["schemas"]["ToolCallRecord"];
export type ToolCallsResponse = components["schemas"]["ToolCallsResponse"];
export type AgentPromptInfo = components["schemas"]["AgentPromptInfo"];
export type RegimeRulesResponse = components["schemas"]["RegimeRulesResponse"];
export type VerdictReviewItem = components["schemas"]["VerdictReviewItem"];
export type VerdictReviewDataResponse = components["schemas"]["VerdictReviewDataResponse"];
export type VerdictReviewSummary = components["schemas"]["VerdictReviewSummary"];
export type VerdictReviewReportResponse = components["schemas"]["VerdictReviewReportResponse"];
export type DataSourceHealth = components["schemas"]["DataSourceHealth"];
export type DataSourcesHealthResponse = components["schemas"]["DataSourcesHealthResponse"];

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(`HTTP ${status}: ${detail}`);
  }
}

/** SWR-friendly GET fetcher：自动 throw 让 SWR 走 error 分支 */
export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? body.message ?? detail;
    } catch {
      // 非 JSON body，保留 statusText
    }
    throw new ApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

/** 内部：发送写请求的通用逻辑，封装错误处理 */
async function requestJSON<TRes>(
  method: "POST" | "PUT" | "DELETE",
  url: string,
  body?: unknown,
): Promise<TRes> {
  const init: RequestInit = {
    method,
    credentials: "same-origin",
  };
  if (body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  const res = await fetch(url, init);
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const json = await res.json();
      // FastAPI validation error 是 detail: [{loc, msg, type}]，把它合并成可读字符串
      if (Array.isArray(json.detail)) {
        detail = json.detail.map((e: { msg?: string; loc?: unknown[] }) =>
          `${(e.loc ?? []).join(".")}: ${e.msg}`,
        ).join("; ");
      } else {
        detail = json.detail ?? json.message ?? detail;
      }
    } catch {
      // 非 JSON 响应，保留 statusText
    }
    throw new ApiError(res.status, detail);
  }
  // DELETE 可能返回 204 无 body
  if (res.status === 204) return undefined as TRes;
  return res.json() as Promise<TRes>;
}

// ─── P2 增长杠杆：手写类型（后端 OpenAPI schema 暂未暴露这三组 model） ────────

/** GET /api/insights/fresh 返回的单条 insight */
export interface FreshInsightItem {
  /** insight 文件名（不含 .md） */
  slug: string;
  /** 一句话总结，供 toast 直接展示 */
  title: string;
  /** 历史命中率 0-1，可能为 null */
  hit_rate: number | null;
  /** 支持样本数，可能为 null */
  sample_count: number | null;
  /** 资产 symbol（如适用），可能为 null */
  asset: string | null;
  /** insight 文件 mtime ISO */
  written_at: string;
}

export interface FreshInsightsResponse {
  count: number;
  items: FreshInsightItem[];
}

/** GET /api/reengagement 返回的单条 alert */
export interface ReengagementAlert {
  /** alert 类型：volatile | high_confidence_buy | stale_decision */
  kind: "volatile" | "high_confidence_buy" | "stale_decision" | string;
  /** 资产 symbol，可能为 null */
  asset: string | null;
  /** 给用户看的一句话 */
  message: string;
  /** 严重程度 */
  severity: "info" | "warn" | "urgent";
  /** 检测时间 ISO */
  detected_at: string;
}

export interface ReengagementResponse {
  count: number;
  alerts: ReengagementAlert[];
}

/** GET /api/outperform_events 返回的单条事件 */
export interface OutperformEvent {
  /** snapshot 时间戳 ISO */
  ts: string;
  /** 基准名，如 余额宝 / 沪深300 */
  benchmark: string;
  /** openInvest 实盘累计涨幅 % */
  user_pct: number;
  /** 基准累计涨幅 % */
  bench_pct: number;
  /** 跑赢幅度 % (user - bench) */
  diff_pct: number;
  /** 拼好的可分享文案 */
  label: string;
}

export interface OutperformEventsResponse {
  count: number;
  events: OutperformEvent[];
}

/** POST helper（PR 4 写操作用） */
export async function postJSON<TReq, TRes>(url: string, body: TReq): Promise<TRes> {
  return requestJSON<TRes>("POST", url, body);
}

/** PUT helper（strategy 写操作用） */
export async function putJSON<TReq, TRes>(url: string, body: TReq): Promise<TRes> {
  return requestJSON<TRes>("PUT", url, body);
}

/** DELETE helper（删 target_asset 用） */
export async function deleteJSON<TRes>(url: string): Promise<TRes> {
  return requestJSON<TRes>("DELETE", url);
}
