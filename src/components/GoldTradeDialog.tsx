import { useState } from "react";
import { mutate } from "swr";
import {
  ApiError,
  postJSON,
  type GoldTradeRequest,
  type WriteResponse,
} from "../lib/api-client";
import { Dialog } from "./Dialog";
import { Field, inputClass } from "./Field";
import { Button } from "./Button";

/** 黄金买入 / 卖出对话框，复用同一个 body schema */
export function GoldTradeDialog({
  mode,
  open,
  onClose,
}: {
  mode: "buy" | "sell";
  open: boolean;
  onClose: () => void;
}) {
  const [grams, setGrams] = useState("");
  const [price, setPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = mode === "buy" ? "黄金买入" : "黄金卖出";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const g = parseFloat(grams);
    const p = parseFloat(price);
    if (!g || g <= 0) return setError("克数必须 > 0");
    if (!p || p <= 0) return setError("单价必须 > 0");

    setSubmitting(true);
    try {
      const body: GoldTradeRequest = { grams: g, price_per_gram: p };
      const url = mode === "buy" ? "/api/gold/buy" : "/api/gold/sell";
      await postJSON<GoldTradeRequest, WriteResponse>(url, body);
      await Promise.all([
        mutate("/api/portfolio"),
        mutate("/api/holdings"),
        mutate("/api/gold"),
        mutate("/api/history?limit=200"),
      ]);
      setGrams("");
      setPrice("");
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  const total = grams && price ? (parseFloat(grams) * parseFloat(price)).toFixed(2) : null;

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="克数 (g)">
          <input
            type="number"
            inputMode="decimal"
            step="0.0001"
            min="0"
            className={inputClass}
            value={grams}
            onChange={(e) => setGrams(e.target.value)}
            placeholder="例如 5.0"
            autoFocus
            required
          />
        </Field>
        <Field label="单价 (CNY/g)" hint="浙商当日实际成交克价">
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            className={inputClass}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="例如 1040"
            required
          />
        </Field>
        {total && (
          <div className="rounded bg-zinc-950/60 border border-zinc-800 px-3 py-2 text-sm text-zinc-300 tabular-nums">
            预计{mode === "buy" ? "支付" : "毛收入"} ¥{total}
            {mode === "sell" && <span className="text-xs text-zinc-500 ml-2">（卖出会扣 0.38% 手续费）</span>}
          </div>
        )}
        {error && <p className="text-sm text-red-400">⚠ {error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" type="button" onClick={onClose} disabled={submitting}>
            取消
          </Button>
          <Button variant={mode === "sell" ? "danger" : "primary"} type="submit" disabled={submitting}>
            {submitting ? "提交中..." : mode === "buy" ? "确认买入" : "确认卖出"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
