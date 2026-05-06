import { useEffect, useRef, useState } from "react";
import { fetcher } from "../lib/api-client";
import type { components } from "../lib/api-types";

type SymbolSearchResult = components["schemas"]["SymbolSearchResult"];
type SymbolSearchResponse = components["schemas"]["SymbolSearchResponse"];

/**
 * 资产 symbol 搜索框（v2 通用化关键 UX）
 *
 * - 用 yfinance Search（零 token 配置）
 * - 输入 200ms debounce 后调 /api/symbols/search
 * - 下拉显示候选；点击命中 → 调 onSelect 回填表单
 * - 没命中也允许用户硬填 symbol（input 直接带回）
 */
export function SymbolSearch({
  value,
  onChange,
  onSelect,
  disabled,
  autoFocus,
}: {
  value: string;
  onChange: (val: string) => void;
  onSelect: (hit: SymbolSearchResult) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const [results, setResults] = useState<SymbolSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<number | null>(null);

  // debounce 搜索
  useEffect(() => {
    if (!value || value.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await fetcher<SymbolSearchResponse>(
          `/api/symbols/search?q=${encodeURIComponent(value)}&limit=8`,
        );
        setResults(data.results);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [value]);

  function pick(hit: SymbolSearchResult) {
    onSelect(hit);
    setOpen(false);
    setResults([]);
  }

  return (
    <div className="relative">
      <input
        type="text"
        className="w-full bg-[var(--surface-base)] border border-[var(--border-strong)] focus:border-[var(--accent)] focus:outline-none px-3 py-2 text-sm tabular-nums font-mono transition-colors duration-100"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // 给点击候选项留一点时间（onClick 在 onBlur 之后）
          blurTimer.current = window.setTimeout(() => setOpen(false), 150);
        }}
        placeholder="输入 symbol 或名称（如 AAPL / 苹果 / 腾讯）"
        autoFocus={autoFocus}
        disabled={disabled}
        autoComplete="off"
      />
      {open && (results.length > 0 || loading) && (
        <ul className="absolute z-10 mt-1 w-full bg-[var(--surface-raised)] border border-[var(--border-strong)] rounded shadow-lg max-h-60 overflow-auto">
          {loading && (
            <li className="px-3 py-2 text-sm text-[var(--text-tertiary)]">搜索中...</li>
          )}
          {!loading && results.length === 0 && (
            <li className="px-3 py-2 text-sm text-[var(--text-tertiary)]">无匹配；可直接输入完整 symbol</li>
          )}
          {results.map((r) => (
            <li
              key={r.symbol}
              onMouseDown={(e) => {
                // 用 onMouseDown 而不是 onClick，避免 onBlur 抢先触发
                e.preventDefault();
                if (blurTimer.current) clearTimeout(blurTimer.current);
                pick(r);
              }}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-[var(--surface-overlay)] border-b border-[var(--border-subtle)] last:border-b-0"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[var(--accent)]">{r.symbol}</span>
                <span className="text-xs text-[var(--text-tertiary)]">{r.exchange ?? ""} · {r.quote_type ?? ""}</span>
              </div>
              <div className="text-xs text-[var(--text-secondary)] truncate">
                {r.shortname ?? r.longname ?? ""}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
