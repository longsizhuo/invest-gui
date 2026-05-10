/**
 * SWR_KEYS — 后端 API 路径常量
 *
 * 为什么需要这个文件：
 * - 后端 web_api.py 拆分或重命名路由时，只改这一个文件，所有 useSWR / mutate 调用自动更新
 * - 消除字符串拼写错误："/api/holdinsg" 这类 typo 在 tsc 编译时会被发现
 * - 方便全局 grep + 替换（工程债清理时 one-stop-shop）
 *
 * 命名约定：
 * - 静态路径：直接赋字符串（如 HOLDINGS）
 * - 带参数的动态路径：用函数（如 REGIME(symbol)）
 * - query 参数如果固定（如 limit=200）也包含在常量里
 *   如果动态，则在调用处拼接（如 LLM_USAGE + "?since=30"）
 */

export const SWR_KEYS = {
  // ─── 持仓 / 现金 ──────────────────────────────────────────────────────────
  /** GET /api/holdings —— 通用化持仓列表（含行情） */
  HOLDINGS: "/api/holdings",

  /** GET /api/portfolio —— 旧版 portfolio（部分 dialog 还在用） */
  PORTFOLIO: "/api/portfolio",

  /** GET /api/portfolio/total_value?base=CNY —— DashboardHero 总资产 */
  PORTFOLIO_TOTAL_VALUE: "/api/portfolio/total_value?base=CNY",

  /** GET /api/gold —— 黄金持仓（GoldTradeDialog / GoldOffsetDialog） */
  GOLD: "/api/gold",

  // ─── 交易流水 ──────────────────────────────────────────────────────────────
  /** GET /api/history?limit=200 —— 旧版交易流水（CashDialog / GoldTradeDialog 写后 mutate） */
  HISTORY: "/api/history?limit=200",

  /** GET /api/trades —— 新内部账本（RecordModal / BulkImport 写后 mutate） */
  TRADES: "/api/trades",

  /** GET /api/trades?limit=20 —— 近 20 条（Dashboard 快捷视图） */
  TRADES_RECENT: "/api/trades?limit=20",

  // ─── 策略 ─────────────────────────────────────────────────────────────────
  /** GET /api/strategy —— 目标配置 + target_assets */
  STRATEGY: "/api/strategy",

  // ─── 委员会 ───────────────────────────────────────────────────────────────
  /** GET /api/committee_sessions?limit=N —— 历史决议列表（N 在调用处拼） */
  COMMITTEE_SESSIONS_BASE: "/api/committee_sessions",

  /** GET /api/committee_sessions?limit=1 —— DashboardHero 最近一条 */
  COMMITTEE_SESSIONS_LATEST: "/api/committee_sessions?limit=1",

  /** GET /api/committee_sessions?limit=5 —— Dashboard 快速记账卡片 */
  COMMITTEE_SESSIONS_5: "/api/committee_sessions?limit=5",

  /** GET /api/committee_sessions?limit=100 —— HistoryTab 完整列表 */
  COMMITTEE_SESSIONS_100: "/api/committee_sessions?limit=100",

  /** 动态：GET /api/committee_sessions/{date}/{symbol} */
  committeeSessionDetail: (date: string, symbol: string) =>
    `/api/committee_sessions/${encodeURIComponent(date)}/${encodeURIComponent(symbol)}`,

  // ─── 命中率 / verdict review ───────────────────────────────────────────────
  /** GET /api/verdict_review/summary */
  VERDICT_REVIEW_SUMMARY: "/api/verdict_review/summary",

  /** GET /api/verdict_review/report */
  VERDICT_REVIEW_REPORT: "/api/verdict_review/report",

  // ─── 系统 ─────────────────────────────────────────────────────────────────
  /** GET /api/jobs/status —— Cron Jobs 时刻表 */
  JOBS_STATUS: "/api/jobs/status",

  /** GET /api/insights —— 长期 insights（Dreaming 沉淀） */
  INSIGHTS: "/api/insights",

  /** GET /api/dreams/state?event_limit=30 —— Dreams 短期记忆 */
  DREAMS_STATE: "/api/dreams/state?event_limit=30",

  /** GET /api/pnl_history?since=200 —— PnL 快照点 */
  PNL_HISTORY: "/api/pnl_history?since=200",

  /** 动态：GET /api/regime/{symbol} */
  regime: (symbol: string) => `/api/regime/${encodeURIComponent(symbol)}`,

  /** GET /api/regime_rules —— Agents tab：regime 规则全文 */
  REGIME_RULES: "/api/regime_rules",

  /** GET /api/data_sources/health —— 数据源健康度 */
  DATASOURCES_HEALTH: "/api/data_sources/health",

  // ─── LLM 用量 ─────────────────────────────────────────────────────────────
  /** GET /api/llm/summary —— 本月 token / 成本 / 调用次数汇总 */
  LLM_SUMMARY: "/api/llm/summary",

  /** GET /api/llm/usage?since=100 —— 最近 100 条 LLM 调用明细 */
  LLM_USAGE_100: "/api/llm/usage?since=100",

  /** 动态：GET /api/llm/usage?since=N */
  llmUsage: (since: number) => `/api/llm/usage?since=${since}`,

  // ─── Tool Calls ───────────────────────────────────────────────────────────
  /** 动态：GET /api/tool_calls?limit=N&session_id=... 等（ToolCallsTab 在调用处拼） */
  TOOL_CALLS_BASE: "/api/tool_calls",

  // ─── 增长杠杆 ─────────────────────────────────────────────────────────────
  /** GET /api/outperform_events —— 跑赢基准分享卡 */
  OUTPERFORM_EVENTS: "/api/outperform_events",

  /** GET /api/insights/fresh —— 新鲜 insight 通知 */
  INSIGHTS_FRESH: "/api/insights/fresh",

  /** GET /api/reengagement —— 再参与 alert */
  REENGAGEMENT: "/api/reengagement",

  // ─── 推送 ─────────────────────────────────────────────────────────────────
  /** POST /api/push/test —— 发送测试消息（PushTab） */
  PUSH_TEST: "/api/push/test",

  // ─── 公开命中率 ────────────────────────────────────────────────────────────
  /** GET /api/stats/public —— 脱敏聚合命中率（PublicStats 页） */
  STATS_PUBLIC: "/api/stats/public",

  // ─── POST 写端点（虽然不是 SWR 拉取目标，但也要常量化，避免 typo + 后端拆分时漏改）
  /** POST /api/strategy/allocations —— 改 target_allocation 比例 */
  STRATEGY_ALLOCATIONS: "/api/strategy/allocations",
  /** POST /api/strategy/asset —— 新增 target_assets 条目 */
  STRATEGY_ASSET: "/api/strategy/asset",
  /** POST /api/holdings —— 新增/覆盖 holding */
  HOLDINGS_POST: "/api/holdings",
  /** POST /api/deposit —— 入金 */
  DEPOSIT: "/api/deposit",
  /** POST /api/withdraw —— 出金 */
  WITHDRAW: "/api/withdraw",
  /** POST /api/gold/buy / /api/gold/sell —— 黄金买卖 */
  GOLD_BUY: "/api/gold/buy",
  GOLD_SELL: "/api/gold/sell",
  /** POST /api/gold/offset —— 渠道点差校准 */
  GOLD_OFFSET: "/api/gold/offset",
  /** POST /api/trades/record —— 一键记账 */
  TRADES_RECORD: "/api/trades/record",
  /** 动态：PATCH /api/trades/{id}/status */
  tradesStatus: (id: number) => `/api/trades/${id}/status`,
  /** POST /api/committee/run —— 触发委员会异步任务 */
  COMMITTEE_RUN: "/api/committee/run",
} as const;
