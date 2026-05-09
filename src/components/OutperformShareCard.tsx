import { useCallback, useState } from "react";
import useSWR from "swr";
import { fetcher, type OutperformEventsResponse } from "../lib/api-client";

/**
 * OutperformShareCard
 *
 * 展示最近一次 openInvest 跑赢基准的"分享瞬间"。
 * - 卡片高度控制在 80px 以内，不喧宾夺主
 * - "分享"按钮：把文案 + 当前页 URL 复制到剪贴板
 * - 数据来自 GET /api/outperform_events，每 5 分钟刷新一次
 * - 没有 events 时渲染 null，不占位
 */
export function OutperformShareCard() {
  const { data } = useSWR<OutperformEventsResponse>(
    "/api/outperform_events",
    fetcher,
    {
      // 跑赢事件更新频率低，5 分钟刷一次即可
      refreshInterval: 5 * 60_000,
      // 失败静默——卡片可以不展示，不影响主流程
      onError: () => undefined,
    },
  );

  // 没数据或没有 events 时不渲染
  if (!data || data.events.length === 0) return null;

  const latest = data.events[0];

  return <OutperformCard event={latest} />;
}

// ─── 内部组件（接受单条 event，方便测试） ─────────────────────────────────────

interface OutperformCardProps {
  event: {
    benchmark: string;
    diff_pct: number;
    label: string;
  };
}

function OutperformCard({ event }: OutperformCardProps) {
  const [copied, setCopied] = useState(false);

  /** 把 label 文案 + 当前页 URL 复制到剪贴板 */
  const handleShare = useCallback(async () => {
    const text = `${event.label}\n${window.location.href}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      // 2 秒后复位按钮状态
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 部分浏览器/环境不支持 clipboard API，降级：选中文本提示用户手动复制
      // 此处简单忽略，不弹错误
    }
  }, [event.label]);

  return (
    <div
      className={[
        "flex items-center gap-3 px-4",
        "bg-[var(--pos-bg)] border border-[var(--pos)]",
        "h-[64px]", // 严格控制在 80px 以内
        "mb-6",     // 和下方内容留间距
      ].join(" ")}
      role="status"
      aria-label={event.label}
    >
      {/* 涨幅数字区 —— 等宽字体强调 */}
      <span className="font-mono text-[var(--pos)] text-base font-semibold shrink-0 tabular-nums">
        +{event.diff_pct.toFixed(2)}%
      </span>

      {/* 文案区 —— 截断防止超出 */}
      <span className="text-xs text-[var(--text-primary)] leading-snug flex-1 truncate">
        跑赢 {event.benchmark}
      </span>

      {/* 分享按钮 */}
      <button
        type="button"
        onClick={handleShare}
        className={[
          "shrink-0 h-7 px-3 text-xs font-medium",
          "border transition-colors duration-100",
          copied
            ? "border-[var(--pos)] text-[var(--pos)] bg-[var(--pos-bg)]"
            : "border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)]",
        ].join(" ")}
        aria-label="复制分享文案"
      >
        {copied ? "已复制" : "分享"}
      </button>
    </div>
  );
}
