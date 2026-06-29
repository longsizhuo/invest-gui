import { useState } from "react";
import { mutate } from "swr";
import { importHoldings, ApiError, type HoldingsImportResponse } from "../../lib/api-client";
import { SWR_KEYS } from "../../lib/swr-keys";
import { Button } from "../../components/Button";
import { useToast } from "../../components/Toast";

/**
 * SmartImportHoldings — 自由文本/CSV 持仓导入（POST /api/holdings/import）
 *
 * 粘贴券商持仓文本 / CSV → 后端 LLM 解析成结构化持仓 → 预览确认 → 非破坏写入。
 * 「非破坏」：只加 portfolio 里还没有的 symbol、cash 只填当前为 0 的币种，
 * 已存在的跳过（要改已有持仓走持仓卡片的编辑）。重复导入幂等、不覆盖真实数据。
 */

interface ParsedHolding {
  symbol: string;
  kind?: string;
  units?: number;
  unit_label?: string;
  avg_cost?: number;
  cost_currency?: string;
  channel?: string;
  display_name?: string;
}
interface ParsedPreview {
  cash?: Record<string, number>;
  holdings?: ParsedHolding[];
}
interface ImportSummary {
  added_holdings?: string[];
  skipped_holdings?: string[];
  cash_set?: Record<string, number>;
  cash_skipped?: Record<string, number>;
}

const PLACEHOLDER = `例：
510300 ETF 3000股 成本4.2元（支付宝）
浙商积存金 5克
余额宝 5万
NDQ.AX 100股 35澳元

也可直接粘贴券商导出的 CSV / 表格。`;

export default function SmartImportHoldings() {
  const [content, setContent] = useState("");
  const [parsing, setParsing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [res, setRes] = useState<HoldingsImportResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const { push: toast } = useToast();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setContent(await f.text());
  }

  async function doPreview() {
    setErr(null);
    setRes(null);
    setParsing(true);
    try {
      setRes(await importHoldings(content, false));
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : String(e));
    } finally {
      setParsing(false);
    }
  }

  async function doCommit() {
    setErr(null);
    setCommitting(true);
    try {
      const out = await importHoldings(content, true);
      const s = (out.summary ?? {}) as unknown as ImportSummary;
      const added = s.added_holdings?.length ?? 0;
      const skipped = s.skipped_holdings?.length ?? 0;
      toast(`已导入 ${added} 个新持仓${skipped ? `，跳过 ${skipped} 个已存在` : ""}`, "info");
      mutate(SWR_KEYS.HOLDINGS);
      setRes(out);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : String(e);
      setErr(msg);
      toast("导入失败", "urgent");
    } finally {
      setCommitting(false);
    }
  }

  const parsed = (res?.parsed ?? undefined) as unknown as ParsedPreview | undefined;
  const summary = (res?.summary ?? undefined) as unknown as ImportSummary | undefined;
  const holdings = parsed?.holdings ?? [];
  const cashEntries = Object.entries(parsed?.cash ?? {});

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <header>
        <h1 className="font-display text-3xl text-[var(--text-primary)] mb-1">导入持仓</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          粘贴你的持仓描述（自然语言或 CSV 都行），后端用 LLM 解析成结构化持仓供你确认。
          <strong className="text-[var(--text-primary)]">确认导入只新增、不覆盖</strong>已有持仓。
        </p>
      </header>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={PLACEHOLDER}
        rows={8}
        className="w-full bg-[var(--surface-raised)] border border-[var(--border-subtle)] p-3 text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" onClick={doPreview} disabled={parsing || committing || !content.trim()}>
          {parsing ? "解析中…" : "解析预览"}
        </Button>
        <label className="text-sm text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)]">
          <span className="underline">从文件读取</span>
          <input type="file" accept=".csv,.txt,text/*" onChange={onFile} className="hidden" />
        </label>
      </div>

      {err && (
        <div className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3 text-sm text-neg">
          {err.includes("LLM_API_KEY") || err.includes("DEEPSEEK")
            ? "后端未配置 LLM Key，无法解析持仓文本。请在 .env 配 LLM_API_KEY / DEEPSEEK_API_KEY。"
            : err}
        </div>
      )}

      {res && (
        <div className="space-y-3">
          <div className="text-sm text-[var(--text-secondary)]">
            解析出 <strong className="text-[var(--text-primary)]">{holdings.length}</strong> 个持仓
            {cashEntries.length > 0 && (
              <> + 现金 {cashEntries.map(([c, v]) => `${c} ${v}`).join(" / ")}</>
            )}
          </div>

          {holdings.length > 0 && (
            <div className="overflow-x-auto border border-[var(--border-subtle)]">
              <table className="w-full text-sm">
                <thead className="bg-[var(--surface-raised)] text-[var(--text-tertiary)]">
                  <tr>
                    <th className="px-2 py-1 text-left">symbol</th>
                    <th className="px-2 py-1 text-left">类型</th>
                    <th className="px-2 py-1 text-right">数量</th>
                    <th className="px-2 py-1 text-right">成本</th>
                    <th className="px-2 py-1 text-left">币种</th>
                    <th className="px-2 py-1 text-left">渠道</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h, i) => (
                    <tr key={`${h.symbol}-${i}`} className="border-t border-[var(--border-subtle)]">
                      <td className="px-2 py-1 font-mono text-[var(--text-primary)]">{h.symbol}</td>
                      <td className="px-2 py-1 text-[var(--text-secondary)]">{h.kind ?? "—"}</td>
                      <td className="px-2 py-1 text-right text-[var(--text-secondary)] tabular-nums">
                        {h.units ?? "—"} {h.unit_label ?? ""}
                      </td>
                      <td className="px-2 py-1 text-right text-[var(--text-secondary)] tabular-nums">{h.avg_cost ?? "—"}</td>
                      <td className="px-2 py-1 text-[var(--text-secondary)]">{h.cost_currency ?? "—"}</td>
                      <td className="px-2 py-1 text-[var(--text-tertiary)] max-w-[140px] truncate" title={h.channel}>
                        {h.channel ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {res.committed ? (
            <div className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3 text-sm space-y-1">
              <div className="text-pos font-medium">✓ 已导入</div>
              <div className="text-[var(--text-secondary)]">
                新增 {summary?.added_holdings?.length ?? 0} 个持仓
                {(summary?.skipped_holdings?.length ?? 0) > 0 && (
                  <>，跳过 {summary?.skipped_holdings?.length} 个已存在（{summary?.skipped_holdings?.join(", ")}）</>
                )}
              </div>
            </div>
          ) : (
            <Button variant="primary" onClick={doCommit} disabled={committing || holdings.length === 0}>
              {committing ? "导入中…" : `确认导入 ${holdings.length} 个持仓`}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
