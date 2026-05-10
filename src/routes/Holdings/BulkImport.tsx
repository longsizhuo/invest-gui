import { useState, useRef } from "react";
import { mutate } from "swr";
import { recordTrade, ApiError } from "../../lib/api-client";
import type { TradeRecordRequest } from "../../lib/api-client";
import { SWR_KEYS } from "../../lib/swr-keys";
import { Button } from "../../components/Button";
import { useToast } from "../../components/Toast";

/**
 * BulkImport — 批量录入历史交易
 *
 * 支持两种录入方式：
 * 1. CSV 粘贴：header 行 symbol,direction,units,price,date,note + 数据行
 * 2. 逐行手动：动态增删行，最后批量提交
 *
 * 错误处理：单行失败高亮显示原因，不影响其他行提交。
 */

// ─── 类型 ─────────────────────────────────────────────────────────────────────

/** 单行录入的原始数据 */
interface RawRow {
  symbol: string;
  direction: string;
  units: string;
  price: string;
  date: string;
  note: string;
}

/** 解析 / 提交后的行状态 */
type RowStatus = "pending" | "submitting" | "ok" | "error";

interface ParsedRow {
  /** 序号，仅用于 key */
  idx: number;
  raw: RawRow;
  /** 解析错误（校验阶段） */
  parseError?: string;
  /** 提交状态 */
  status: RowStatus;
  /** 提交失败原因 */
  submitError?: string;
}

// ─── CSV 解析工具 ──────────────────────────────────────────────────────────────

/** 期望的 CSV header */
const CSV_HEADERS = ["symbol", "direction", "units", "price", "date", "note"] as const;

/**
 * 解析 CSV 文本 → RawRow[]
 * - 跳过空行
 * - 第一行必须是 header（大小写不敏感）
 * - 超出列数的字段忽略，缺失字段补空
 */
function parseCsv(text: string): { rows: RawRow[]; headerError?: string } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return { rows: [] };

  // 校验 header
  const headerLine = lines[0].toLowerCase();
  const headerCols = headerLine.split(",").map((h) => h.trim());
  const missingHeaders = CSV_HEADERS.filter((h) => !headerCols.includes(h));
  if (missingHeaders.length > 0) {
    return {
      rows: [],
      headerError: `Header 缺少字段: ${missingHeaders.join(", ")}。期望：${CSV_HEADERS.join(",")}`,
    };
  }

  // 建立 header → 列索引 映射
  const colIdx: Record<string, number> = {};
  headerCols.forEach((h, i) => { colIdx[h] = i; });

  const rows: RawRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvRow(lines[i]);
    const get = (key: string) => cols[colIdx[key] ?? -1]?.trim() ?? "";
    rows.push({
      symbol: get("symbol"),
      direction: get("direction").toUpperCase(),
      units: get("units"),
      price: get("price"),
      date: get("date"),
      note: get("note"),
    });
  }
  return { rows };
}

/** 简单 CSV 行分割（不处理带逗号的引号字段，交易数据无此场景） */
function splitCsvRow(line: string): string[] {
  return line.split(",");
}

// ─── 行校验 ───────────────────────────────────────────────────────────────────

/** 校验单行，返回错误信息或 undefined（通过） */
function validateRow(raw: RawRow): string | undefined {
  if (!raw.symbol.trim()) return "symbol 不能为空";
  if (!["BUY", "SELL"].includes(raw.direction)) return `direction 必须是 BUY 或 SELL（当前: ${raw.direction || "空"}）`;
  const units = parseFloat(raw.units);
  if (isNaN(units) || units <= 0) return `units 必须是正数（当前: ${raw.units || "空"}）`;
  if (raw.price.trim() && isNaN(parseFloat(raw.price))) return `price 格式错误（当前: ${raw.price}）`;
  return undefined;
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────

export default function BulkImport() {
  const [mode, setMode] = useState<"csv" | "manual">("csv");
  const { push: toast } = useToast();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-[var(--text-primary)] mb-1">批量录入交易</h1>
        <p className="text-xs text-[var(--text-tertiary)]">
          支持 CSV 粘贴或逐行手动输入，每行失败不影响其他行
        </p>
      </header>

      {/* 模式切换 */}
      <div className="flex gap-1 border-b border-[var(--border-subtle)]">
        {(["csv", "manual"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={
              "px-4 py-2 text-sm border-b-2 -mb-px transition-colors duration-100 " +
              (mode === m
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]")
            }
          >
            {m === "csv" ? "CSV 粘贴" : "逐行手动"}
          </button>
        ))}
      </div>

      {mode === "csv" ? (
        <CsvImporter onToast={toast} />
      ) : (
        <ManualImporter onToast={toast} />
      )}
    </div>
  );
}

// ─── CSV 粘贴导入 ─────────────────────────────────────────────────────────────

function CsvImporter({ onToast }: { onToast: (msg: string, sev?: "info" | "warn" | "urgent") => void }) {
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<ParsedRow[] | null>(null);
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /** 解析 CSV → 预览表格 */
  function handlePreview() {
    const { rows, headerError: he } = parseCsv(csvText);
    if (he) {
      setHeaderError(he);
      setPreview(null);
      return;
    }
    setHeaderError(null);
    setPreview(
      rows.map((raw, idx) => ({
        idx,
        raw,
        parseError: validateRow(raw),
        status: "pending",
      })),
    );
  }

  /** 批量提交所有校验通过的行 */
  async function handleSubmit() {
    if (!preview) return;
    setSubmitting(true);

    const updated = [...preview];
    let okCount = 0;
    let errCount = 0;

    for (let i = 0; i < updated.length; i++) {
      const row = updated[i];
      // 跳过已成功或有解析错误的行
      if (row.status === "ok" || row.parseError) continue;

      updated[i] = { ...row, status: "submitting" };
      setPreview([...updated]);

      try {
        const req: TradeRecordRequest = {
          symbol: row.raw.symbol.trim().toUpperCase(),
          direction: row.raw.direction as "BUY" | "SELL",
          units: parseFloat(row.raw.units),
          note: row.raw.note.trim() || undefined,
        };
        const priceNum = parseFloat(row.raw.price);
        if (row.raw.price.trim() && !isNaN(priceNum)) req.price = priceNum;

        await recordTrade(req);
        updated[i] = { ...updated[i], status: "ok" };
        okCount++;
      } catch (err) {
        const msg = err instanceof ApiError ? err.detail : String(err);
        updated[i] = { ...updated[i], status: "error", submitError: msg };
        errCount++;
      }

      // 每提交一行都刷新 UI
      setPreview([...updated]);
    }

    setSubmitting(false);
    // 刷新 trades SWR 缓存
    await mutate(SWR_KEYS.TRADES);
    await mutate(SWR_KEYS.TRADES_RECENT);

    if (okCount > 0 && errCount === 0) {
      onToast(`全部 ${okCount} 笔交易记录成功`, "info");
    } else if (okCount > 0) {
      onToast(`${okCount} 笔成功，${errCount} 笔失败（见高亮行）`, "warn");
    } else {
      onToast(`全部 ${errCount} 笔失败，请检查高亮行`, "urgent");
    }
  }

  const validCount = preview?.filter((r) => !r.parseError && r.status !== "ok").length ?? 0;
  const doneCount = preview?.filter((r) => r.status === "ok").length ?? 0;

  return (
    <div className="space-y-4">
      {/* 格式说明 */}
      <div className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4 text-xs text-[var(--text-secondary)] space-y-1">
        <p className="font-semibold text-[var(--text-primary)]">CSV 格式说明</p>
        <p>第一行必须是 header（严格匹配）：</p>
        <pre className="font-mono text-[var(--accent)]">symbol,direction,units,price,date,note</pre>
        <p>后续每行是一笔交易，price / date / note 可留空：</p>
        <pre className="font-mono text-[var(--text-primary)]">
{`NDQ.AX,BUY,10,31.50,2026-05-01,委员会BUY建议
GC=F,BUY,5,,2026-04-28,黄金加仓`}
        </pre>
      </div>

      {/* CSV 输入框 */}
      <textarea
        className={
          "w-full bg-[var(--surface-base)] border border-[var(--border-strong)] " +
          "px-3 py-2 text-sm font-mono text-[var(--text-primary)] " +
          "placeholder:text-[var(--text-tertiary)] " +
          "focus:border-[var(--accent)] focus:outline-none " +
          "resize-y min-h-[200px]"
        }
        value={csvText}
        onChange={(e) => { setCsvText(e.target.value); setPreview(null); setHeaderError(null); }}
        placeholder={`symbol,direction,units,price,date,note\nNDQ.AX,BUY,10,31.50,2026-05-01,委员会建议`}
        spellCheck={false}
      />

      {/* 错误提示 */}
      {headerError && (
        <div className="border border-[var(--neg)] px-4 py-3 text-sm text-neg">
          {headerError}
        </div>
      )}

      <div className="flex gap-2 items-center">
        <Button variant="outline" onClick={handlePreview} disabled={!csvText.trim()}>
          解析预览
        </Button>
        {preview && validCount > 0 && (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "提交中..." : `提交 ${validCount} 笔`}
          </Button>
        )}
        {doneCount > 0 && (
          <span className="text-xs text-pos font-mono">已完成 {doneCount} 笔</span>
        )}
      </div>

      {/* 预览表格 */}
      {preview && preview.length > 0 && (
        <PreviewTable rows={preview} />
      )}
      {preview && preview.length === 0 && (
        <p className="text-sm text-[var(--text-tertiary)]">CSV 无数据行（只有 header）</p>
      )}
    </div>
  );
}

// ─── 逐行手动录入 ──────────────────────────────────────────────────────────────

/** 一个空白行的初始值 */
function emptyRow(): RawRow {
  return { symbol: "", direction: "BUY", units: "", price: "", date: "", note: "" };
}

function ManualImporter({ onToast }: { onToast: (msg: string, sev?: "info" | "warn" | "urgent") => void }) {
  const [rows, setRows] = useState<RawRow[]>([emptyRow()]);
  const [statuses, setStatuses] = useState<Map<number, { status: RowStatus; error?: string }>>(new Map());
  const [submitting, setSubmitting] = useState(false);
  // 用于分配稳定 key 的自增 id
  const keyRef = useRef(1);
  const [keys, setKeys] = useState<number[]>([0]);

  function addRow() {
    const newKey = keyRef.current++;
    setRows((prev) => [...prev, emptyRow()]);
    setKeys((prev) => [...prev, newKey]);
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
    setKeys((prev) => prev.filter((_, i) => i !== idx));
    setStatuses((prev) => {
      const next = new Map(prev);
      next.delete(idx);
      return next;
    });
  }

  function updateRow(idx: number, patch: Partial<RawRow>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
    // 清空该行状态（用户修改后重置）
    setStatuses((prev) => { const n = new Map(prev); n.delete(idx); return n; });
  }

  async function handleSubmit() {
    setSubmitting(true);
    let okCount = 0;
    let errCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];
      const validErr = validateRow(raw);
      if (validErr) {
        setStatuses((prev) => new Map(prev).set(i, { status: "error", error: validErr }));
        errCount++;
        continue;
      }

      setStatuses((prev) => new Map(prev).set(i, { status: "submitting" }));

      try {
        const req: TradeRecordRequest = {
          symbol: raw.symbol.trim().toUpperCase(),
          direction: raw.direction as "BUY" | "SELL",
          units: parseFloat(raw.units),
          note: raw.note.trim() || undefined,
        };
        const priceNum = parseFloat(raw.price);
        if (raw.price.trim() && !isNaN(priceNum)) req.price = priceNum;
        await recordTrade(req);
        setStatuses((prev) => new Map(prev).set(i, { status: "ok" }));
        okCount++;
      } catch (err) {
        const msg = err instanceof ApiError ? err.detail : String(err);
        setStatuses((prev) => new Map(prev).set(i, { status: "error", error: msg }));
        errCount++;
      }
    }

    setSubmitting(false);
    await mutate(SWR_KEYS.TRADES);
    await mutate(SWR_KEYS.TRADES_RECENT);

    if (okCount > 0 && errCount === 0) {
      onToast(`全部 ${okCount} 笔记录成功`, "info");
    } else if (okCount > 0) {
      onToast(`${okCount} 笔成功，${errCount} 笔失败`, "warn");
    } else {
      onToast(`全部 ${errCount} 笔失败，请检查错误行`, "urgent");
    }
  }

  // 列宽 class
  const cellClass = "px-2 py-1.5";
  const inputSm =
    "w-full bg-[var(--surface-base)] border border-[var(--border-strong)] " +
    "px-2 py-1 text-xs font-mono text-[var(--text-primary)] " +
    "focus:border-[var(--accent)] focus:outline-none";

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-xs border border-[var(--border-subtle)]">
          <thead className="bg-[var(--surface-raised)] text-[var(--text-tertiary)]">
            <tr>
              <th className={`${cellClass} text-left w-32`}>Symbol</th>
              <th className={`${cellClass} text-left w-24`}>方向</th>
              <th className={`${cellClass} text-left w-24`}>手数</th>
              <th className={`${cellClass} text-left w-24`}>价格（选填）</th>
              <th className={`${cellClass} text-left w-28`}>日期（选填）</th>
              <th className={`${cellClass} text-left`}>备注（选填）</th>
              <th className={`${cellClass} text-left w-20`}>状态</th>
              <th className={`${cellClass} w-8`}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const st = statuses.get(i);
              const rowBg =
                st?.status === "ok"
                  ? "bg-[var(--pos)]/10"
                  : st?.status === "error"
                    ? "bg-[var(--neg)]/10"
                    : "";

              return (
                <tr key={keys[i]} className={`border-t border-[var(--border-subtle)] ${rowBg}`}>
                  <td className={cellClass}>
                    <input
                      type="text"
                      className={inputSm}
                      value={row.symbol}
                      onChange={(e) => updateRow(i, { symbol: e.target.value })}
                      placeholder="NDQ.AX"
                      disabled={st?.status === "ok" || submitting}
                    />
                  </td>
                  <td className={cellClass}>
                    <select
                      className={`${inputSm} cursor-pointer`}
                      value={row.direction}
                      onChange={(e) => updateRow(i, { direction: e.target.value })}
                      disabled={st?.status === "ok" || submitting}
                    >
                      <option value="BUY">BUY</option>
                      <option value="SELL">SELL</option>
                    </select>
                  </td>
                  <td className={cellClass}>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      min="0"
                      className={inputSm}
                      value={row.units}
                      onChange={(e) => updateRow(i, { units: e.target.value })}
                      placeholder="10"
                      disabled={st?.status === "ok" || submitting}
                    />
                  </td>
                  <td className={cellClass}>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      min="0"
                      className={inputSm}
                      value={row.price}
                      onChange={(e) => updateRow(i, { price: e.target.value })}
                      placeholder="31.50"
                      disabled={st?.status === "ok" || submitting}
                    />
                  </td>
                  <td className={cellClass}>
                    <input
                      type="text"
                      className={inputSm}
                      value={row.date}
                      onChange={(e) => updateRow(i, { date: e.target.value })}
                      placeholder="2026-05-01"
                      disabled={st?.status === "ok" || submitting}
                    />
                  </td>
                  <td className={cellClass}>
                    <input
                      type="text"
                      className={inputSm}
                      value={row.note}
                      onChange={(e) => updateRow(i, { note: e.target.value })}
                      placeholder="备注"
                      disabled={st?.status === "ok" || submitting}
                    />
                  </td>
                  <td className={`${cellClass} font-mono`}>
                    {!st && (
                      <span className="text-[var(--text-tertiary)]">—</span>
                    )}
                    {st?.status === "submitting" && (
                      <span className="text-[var(--text-secondary)]">...</span>
                    )}
                    {st?.status === "ok" && (
                      <span className="text-pos font-bold">OK</span>
                    )}
                    {st?.status === "error" && (
                      <span className="text-neg" title={st.error}>失败</span>
                    )}
                  </td>
                  <td className={cellClass}>
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      disabled={rows.length === 1 || submitting}
                      className="text-[var(--text-tertiary)] hover:text-neg transition-colors disabled:opacity-30 text-base leading-none"
                      title="删除此行"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 错误行详情展示 */}
      {Array.from(statuses.entries()).some(([, v]) => v.status === "error" && v.error) && (
        <div className="border border-[var(--neg)] bg-[var(--surface-raised)] p-3 space-y-1">
          <p className="text-xs font-semibold text-neg">失败行详情：</p>
          {Array.from(statuses.entries())
            .filter(([, v]) => v.status === "error" && v.error)
            .map(([idx, v]) => (
              <p key={idx} className="text-xs text-[var(--text-secondary)] font-mono">
                第 {idx + 1} 行：{v.error}
              </p>
            ))}
        </div>
      )}

      {/* 底部操作 */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={addRow} disabled={submitting}>
          + 添加行
        </Button>
        <Button onClick={handleSubmit} disabled={submitting || rows.length === 0}>
          {submitting ? "提交中..." : `批量提交 ${rows.length} 行`}
        </Button>
      </div>
    </div>
  );
}

// ─── 预览表格（CSV 模式用） ────────────────────────────────────────────────────

function PreviewTable({ rows }: { rows: ParsedRow[] }) {
  return (
    <div className="border border-[var(--border-subtle)] overflow-hidden overflow-x-auto">
      <table className="w-full text-xs tabular-nums">
        <thead className="bg-[var(--surface-raised)] text-[var(--text-tertiary)]">
          <tr>
            <th className="px-2 py-1.5 text-left w-8">#</th>
            <th className="px-2 py-1.5 text-left">Symbol</th>
            <th className="px-2 py-1.5 text-left">方向</th>
            <th className="px-2 py-1.5 text-right">手数</th>
            <th className="px-2 py-1.5 text-right">价格</th>
            <th className="px-2 py-1.5 text-left">日期</th>
            <th className="px-2 py-1.5 text-left">备注</th>
            <th className="px-2 py-1.5 text-left">状态</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const hasError = row.parseError || row.status === "error";
            const isOk = row.status === "ok";
            const rowClass = hasError
              ? "bg-[var(--neg)]/10 border-t border-[var(--neg)]/30"
              : isOk
                ? "bg-[var(--pos)]/10 border-t border-[var(--border-subtle)]"
                : "border-t border-[var(--border-subtle)]";

            return (
              <tr key={row.idx} className={rowClass}>
                <td className="px-2 py-1 text-[var(--text-tertiary)]">{row.idx + 1}</td>
                <td className="px-2 py-1 font-mono text-[var(--text-primary)]">{row.raw.symbol || "—"}</td>
                <td className={`px-2 py-1 font-mono ${row.raw.direction === "BUY" ? "text-pos" : row.raw.direction === "SELL" ? "text-neg" : "text-[var(--text-tertiary)]"}`}>
                  {row.raw.direction || "—"}
                </td>
                <td className="px-2 py-1 text-right text-[var(--text-primary)]">{row.raw.units || "—"}</td>
                <td className="px-2 py-1 text-right text-[var(--text-secondary)]">{row.raw.price || "—"}</td>
                <td className="px-2 py-1 text-[var(--text-secondary)]">{row.raw.date || "—"}</td>
                <td className="px-2 py-1 text-[var(--text-tertiary)] max-w-[120px] truncate" title={row.raw.note}>
                  {row.raw.note || "—"}
                </td>
                <td className="px-2 py-1">
                  {row.parseError && (
                    <span className="text-neg" title={row.parseError}>校验失败</span>
                  )}
                  {!row.parseError && row.status === "pending" && (
                    <span className="text-[var(--text-tertiary)]">待提交</span>
                  )}
                  {row.status === "submitting" && (
                    <span className="text-[var(--text-secondary)]">提交中...</span>
                  )}
                  {row.status === "ok" && (
                    <span className="text-pos font-bold">OK</span>
                  )}
                  {row.status === "error" && !row.parseError && (
                    <span className="text-neg" title={row.submitError}>提交失败</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
