import { useState } from "react";

/**
 * PnL 趋势图：直接展示后端 docs/pnl_chart.svg
 *
 * 后端 jobs/pnl_snapshot 工作日每 2h 重渲染这张图（含 8 个基准对比）；
 * SVG 文件只含百分比线段，不暴露绝对金额（已审计安全）。
 *
 * 加 ?_=timestamp 强制 bypass 浏览器缓存（后端虽然下了 no-cache，但 CF 缓存 SVG 较激进）。
 */
export function PnLChart() {
  const [errored, setErrored] = useState(false);
  // 每次组件 mount 都换一个 key 触发重拉
  const cacheBuster = Math.floor(Date.now() / 60_000); // 1 分钟级粒度

  if (errored) {
    return (
      <div className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6 text-center text-[var(--text-secondary)] text-sm">
        PnL 趋势图未生成。等 <code className="bg-[var(--surface-base)] px-1 rounded">jobs/pnl_snapshot</code> 跑过一次后再刷新。
      </div>
    );
  }

  return (
    <div className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3">
      <img
        src={`/api/pnl_chart.svg?_=${cacheBuster}`}
        alt="PnL 趋势 vs 8 基准"
        className="w-full h-auto"
        onError={() => setErrored(true)}
      />
    </div>
  );
}
