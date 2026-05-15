/**
 * Events Tab —— 事件感知层调试 view (ADR-006)
 *
 * 给作者 + agent 用的 debug 面板：看后端 event_watch 现在感知到啥新闻。
 * - 顶部：counts chips (high/mid/low/total) + 时间窗 + 立即扫描按钮
 * - 列表：severity 倒序，每条含 stance badge / event_type / 一句话 / symbols / 时间
 *
 * 跟 committee 决策路径解耦：不按 symbol 过滤，纯时序扫描，让你看到
 * "系统现在脑子里在想什么"。
 */
import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "../../lib/api-client";
import { SWR_KEYS } from "../../lib/swr-keys";

type EventItem = {
  event_id: string;
  one_line_claim: string;
  event_type: string;
  stance: "risk" | "opportunity" | "neutral";
  severity: "low" | "mid" | "high";
  affected_symbols: string[];
  entities: string[];
  ts: string;
  committee_task_id: string | null;
};

type EventsRecentResponse = {
  hours: number;
  counts: { low: number; mid: number; high: number; total: number };
  items: EventItem[];
};

type EventCheckResponse = {
  status: string;
  fetched: number;
  new_events: number;
  triggered: number;
  duration_ms: number;
};

const SEVERITY_COLOR: Record<EventItem["severity"], string> = {
  high: "bg-[var(--neg-soft)] text-neg",
  mid:  "bg-[var(--warn-soft)] text-warn",
  low:  "bg-[var(--surface-raised)] text-[var(--text-tertiary)]",
};
const STANCE_COLOR: Record<EventItem["stance"], string> = {
  risk:        "text-neg",
  opportunity: "text-pos",
  neutral:     "text-[var(--text-tertiary)]",
};

export function EventsTab() {
  const [hours, setHours] = useState<24 | 48 | 168>(24);
  const [minSev, setMinSev] = useState<"low" | "mid" | "high">("low");
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<EventCheckResponse | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const url = `${SWR_KEYS.EVENTS_RECENT}?hours=${hours}&min_severity=${minSev}&limit=50`;
  const { data, error, isLoading, mutate } = useSWR<EventsRecentResponse>(url, fetcher);

  async function handleScan() {
    setScanning(true);
    setScanError(null);
    try {
      const res = await fetch(SWR_KEYS.EVENTS_CHECK, {
        method: "POST",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body: EventCheckResponse = await res.json();
      setLastScan(body);
      // 扫完刷一次列表
      await mutate();
    } catch (e) {
      setScanError(e instanceof Error ? e.message : String(e));
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* 说明 + 时间窗 + 立即扫描 */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-[var(--text-tertiary)]">
          事件感知层（ADR-006）—— event_watch cron 每 30 分钟自动跑，下面是数据库里的快照
        </span>
        <div className="ml-auto flex items-center gap-2">
          <select
            className="text-xs bg-[var(--surface-base)] border border-[var(--border-strong)] px-2 py-1"
            value={hours}
            onChange={(e) => setHours(Number(e.target.value) as 24 | 48 | 168)}
          >
            <option value={24}>近 24h</option>
            <option value={48}>近 48h</option>
            <option value={168}>近 7d</option>
          </select>
          <select
            className="text-xs bg-[var(--surface-base)] border border-[var(--border-strong)] px-2 py-1"
            value={minSev}
            onChange={(e) => setMinSev(e.target.value as "low" | "mid" | "high")}
          >
            <option value="low">全部</option>
            <option value="mid">≥ mid</option>
            <option value="high">仅 high</option>
          </select>
          <button
            onClick={handleScan}
            disabled={scanning}
            className="text-xs bg-[var(--accent)] text-[var(--surface-base)] px-3 py-1 font-medium hover:opacity-90 disabled:opacity-50 transition"
          >
            {scanning ? "扫描中..." : "立即扫描"}
          </button>
        </div>
      </div>

      {/* 刚扫描完的结果 */}
      {scanError && (
        <div className="text-xs text-neg border border-neg p-2">
          扫描失败: {scanError}
        </div>
      )}
      {lastScan && !scanError && (
        <div className="text-xs bg-[var(--surface-raised)] p-2 flex flex-wrap gap-3">
          <span>✓ 扫描完成 {Math.round(lastScan.duration_ms / 1000)}s</span>
          <span>拉到 <b>{lastScan.fetched}</b> 条</span>
          <span>新事件 <b>{lastScan.new_events}</b> 条</span>
          <span>触发委员会 <b>{lastScan.triggered}</b> 次</span>
        </div>
      )}

      {/* counts overview */}
      {data && (
        <div className="flex flex-wrap gap-2 text-xs">
          <span className={`px-2 py-1 ${SEVERITY_COLOR.high}`}>
            High: <b>{data.counts.high}</b>
          </span>
          <span className={`px-2 py-1 ${SEVERITY_COLOR.mid}`}>
            Mid: <b>{data.counts.mid}</b>
          </span>
          <span className={`px-2 py-1 ${SEVERITY_COLOR.low}`}>
            Low: <b>{data.counts.low}</b>
          </span>
          <span className="px-2 py-1 bg-[var(--surface-raised)] text-[var(--text-secondary)]">
            Total: <b>{data.counts.total}</b>
          </span>
        </div>
      )}

      {/* 列表 */}
      {isLoading && <div className="text-[var(--text-secondary)] text-sm">加载中...</div>}
      {error && <div className="text-neg text-sm">加载失败: {error.message}</div>}
      {data?.items.length === 0 && (
        <div className="text-[var(--text-tertiary)] text-sm py-8 text-center">
          这段时间窗内没事件。要么没新闻，要么 event_watch 没跑——点上面"立即扫描"试试。
        </div>
      )}
      {data && data.items.length > 0 && (
        <div className="space-y-1.5">
          {data.items.map((it) => (
            <div
              key={it.event_id}
              className="border border-[var(--border-subtle)] p-2.5 text-sm hover:border-[var(--border-strong)] transition"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs mb-1">
                <span className={`px-1.5 py-0.5 ${SEVERITY_COLOR[it.severity]} font-medium`}>
                  {it.severity}
                </span>
                <span className={`${STANCE_COLOR[it.stance]} font-medium`}>
                  {it.stance}
                </span>
                <span className="text-[var(--text-tertiary)]">{it.event_type}</span>
                <span className="text-[var(--text-tertiary)] ml-auto font-mono">
                  {it.ts.slice(0, 16).replace("T", " ")}
                </span>
              </div>
              <div className="text-[var(--text-primary)]">{it.one_line_claim}</div>
              {it.affected_symbols.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1 text-xs">
                  {it.affected_symbols.slice(0, 6).map((s) => (
                    <span
                      key={s}
                      className="px-1.5 py-0.5 bg-[var(--surface-raised)] text-[var(--text-secondary)] font-mono"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
              {it.committee_task_id && (
                <div className="mt-1 text-[10px] text-[var(--text-tertiary)] font-mono">
                  触发了委员会: {it.committee_task_id.slice(0, 8)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
