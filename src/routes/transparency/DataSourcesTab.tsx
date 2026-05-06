import useSWR from "swr";
import { fetcher, type DataSourcesHealthResponse } from "../../lib/api-client";
import { shortTime } from "../../lib/format";

/**
 * 数据源健康面板 — 10 个数据源实时状态
 *
 * 用户 / 外部 agent 能看到「我们用什么数据决策」+「现在数据可不可信」
 */
export function DataSourcesTab() {
  const { data, error, isLoading } = useSWR<DataSourcesHealthResponse>(
    "/api/data_sources/health",
    fetcher,
    { refreshInterval: 60_000 },
  );

  if (isLoading) return <div className="text-zinc-400">检测中...</div>;
  if (error) return <div className="text-red-400">加载失败: {error.message}</div>;
  if (!data) return null;

  const healthy = data.sources.filter((s) => !s.is_stale).length;
  const stale = data.sources.length - healthy;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-3">
        <span className="text-zinc-300">
          <span className="text-green-400 font-semibold">{healthy} 健康</span>
          {stale > 0 && (
            <>
              <span className="text-zinc-500"> / </span>
              <span className="text-red-400 font-semibold">{stale} 陈旧</span>
            </>
          )}
        </span>
        <span className="text-xs text-zinc-500">每 60 秒自动检测</span>
      </div>

      <div className="rounded-lg ring-1 ring-zinc-800 overflow-hidden">
        <table className="w-full text-sm tabular-nums">
          <thead className="bg-zinc-900 text-zinc-400 text-xs">
            <tr>
              <th className="px-3 py-2 text-center w-8">状态</th>
              <th className="px-3 py-2 text-left">名称</th>
              <th className="px-3 py-2 text-left">说明</th>
              <th className="px-3 py-2 text-left">最近成功</th>
              <th className="px-3 py-2 text-left">采样值</th>
            </tr>
          </thead>
          <tbody>
            {data.sources.map((s) => (
              <tr
                key={s.name}
                className={`border-t border-zinc-800 ${s.is_stale ? "bg-red-950/20" : ""}`}
              >
                <td className="px-3 py-2 text-center text-lg">
                  {s.is_stale ? (
                    <span className="text-red-400" title="陈旧或获取失败">⚠</span>
                  ) : (
                    <span className="text-green-400" title="健康">✓</span>
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-gold-400">{s.name}</td>
                <td className="px-3 py-2 text-zinc-400 text-xs">{s.description}</td>
                <td className="px-3 py-2 text-xs text-zinc-500">
                  {s.last_success_at ? shortTime(s.last_success_at) : "—"}
                </td>
                <td className="px-3 py-2 text-xs text-zinc-300">
                  {s.error ? (
                    <span className="text-red-400">{s.error.slice(0, 50)}</span>
                  ) : (
                    String(s.sample_value ?? "—").slice(0, 50)
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
