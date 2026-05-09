import { useState } from "react";
import { mutate } from "swr";
import {
  ApiError,
  postJSON,
  type GoldOffsetRequest,
  type WriteResponse,
} from "../lib/api-client";
import { Dialog } from "./Dialog";
import { Field, inputClass } from "./Field";
import { Button } from "./Button";

/** 报当日买入克价 → 后端反推渠道点差，写回 strategy.md */
export function GoldOffsetDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [bankPrice, setBankPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const p = parseFloat(bankPrice);
    if (!p || p <= 0) return setError("克价必须 > 0");

    setSubmitting(true);
    try {
      const body: GoldOffsetRequest = { bank_price: p };
      const res = await postJSON<GoldOffsetRequest, WriteResponse>("/api/gold/offset", body);
      await Promise.all([
        mutate("/api/strategy"),
        mutate("/api/gold"),
        mutate("/api/holdings"),
      ]);
      setSuccess(res.message);
      setBankPrice("");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="校准黄金点差">
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-xs text-[var(--text-secondary)]">
          输入今日实际买入克价，系统反推渠道溢价，写回 strategy.md 自动学习，无需手动维护。
        </p>
        <Field label="当日买入克价 (CNY/g)">
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            className={inputClass}
            value={bankPrice}
            onChange={(e) => setBankPrice(e.target.value)}
            placeholder="例如 1130"
            autoFocus
            required
          />
        </Field>
        {error && <p className="text-sm text-neg">⚠ {error}</p>}
        {success && <p className="text-sm text-pos">✓ {success}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" type="button" onClick={onClose} disabled={submitting}>
            关闭
          </Button>
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? "计算中..." : "确认反推"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
