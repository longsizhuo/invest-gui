import { useState, useEffect } from "react";
import { mutate } from "swr";
import {
  ApiError,
  putJSON,
  type AllocationsRequest,
  type StrategyWriteResponse,
} from "../lib/api-client";
import { Dialog } from "./Dialog";
import { Field, inputClass } from "./Field";
import { Button } from "./Button";

/** 改 stock/cash 目标分配比例。schema 强约束两者总和 ≈ 1.0 */
export function AllocationsDialog({
  open,
  onClose,
  stock,
  cash,
}: {
  open: boolean;
  onClose: () => void;
  stock: number;
  cash: number;
}) {
  const [stockPct, setStockPct] = useState(String(Math.round(stock * 100)));
  const [cashPct, setCashPct] = useState(String(Math.round(cash * 100)));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 每次打开重置初值（防上次值残留）
  useEffect(() => {
    if (open) {
      setStockPct(String(Math.round(stock * 100)));
      setCashPct(String(Math.round(cash * 100)));
      setError(null);
    }
  }, [open, stock, cash]);

  const total = (parseFloat(stockPct || "0") + parseFloat(cashPct || "0")).toFixed(0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const s = parseFloat(stockPct);
    const c = parseFloat(cashPct);
    if (Number.isNaN(s) || Number.isNaN(c)) return setError("请输入数字");
    if (s + c < 99 || s + c > 101) return setError(`两者之和必须 = 100，当前 = ${s + c}`);

    setSubmitting(true);
    try {
      const body: AllocationsRequest = {
        target_allocation_stock: s / 100,
        target_allocation_cash: c / 100,
      };
      await putJSON<AllocationsRequest, StrategyWriteResponse>(
        "/api/strategy/allocations",
        body,
      );
      await mutate("/api/strategy");
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="改资产配置目标">
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-xs text-[var(--text-secondary)]">两者之和必须等于 100%（schema 强约束 ±1% 容忍）</p>
        <Field label="股票/ETF 占比 (%)">
          <input
            type="number"
            min="0"
            max="100"
            className={inputClass}
            value={stockPct}
            onChange={(e) => setStockPct(e.target.value)}
            autoFocus
            required
          />
        </Field>
        <Field label="现金占比 (%)">
          <input
            type="number"
            min="0"
            max="100"
            className={inputClass}
            value={cashPct}
            onChange={(e) => setCashPct(e.target.value)}
            required
          />
        </Field>
        <div className="rounded bg-[var(--surface-base)]/60 border border-[var(--border-subtle)] px-3 py-2 text-sm tabular-nums">
          合计: <span className={total === "100" ? "text-pos" : "text-warn"}>{total}%</span>
        </div>
        {error && <p className="text-sm text-neg">⚠ {error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" type="button" onClick={onClose} disabled={submitting}>
            取消
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "保存中..." : "保存"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
