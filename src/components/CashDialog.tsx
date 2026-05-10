import { useState } from "react";
import { mutate } from "swr";
import { ApiError, postJSON, type DepositRequest, type WriteResponse } from "../lib/api-client";
import { SWR_KEYS } from "../lib/swr-keys";
import { Dialog } from "./Dialog";
import { Field, inputClass, selectClass } from "./Field";
import { Button } from "./Button";

/**
 * 存款 / 取款 通用对话框
 *
 * 提交成功后：
 * 1. 关闭对话框
 * 2. mutate /api/portfolio + /api/history 让 Dashboard / History 立即重拉
 */
export function CashDialog({
  mode,
  open,
  onClose,
}: {
  mode: "deposit" | "withdraw";
  open: boolean;
  onClose: () => void;
}) {
  const [currency, setCurrency] = useState<"cny" | "aud">("cny");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = mode === "deposit" ? "存入现金" : "取出现金";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const num = parseFloat(amount);
    if (!num || num <= 0) {
      setError("金额必须 > 0");
      return;
    }

    setSubmitting(true);
    try {
      const body: DepositRequest = { currency, amount: num };
      const url = mode === "deposit" ? SWR_KEYS.DEPOSIT : SWR_KEYS.WITHDRAW;
      await postJSON<DepositRequest, WriteResponse>(url, body);
      // 写成功 → 让 Dashboard / 通用持仓 / History 立即重拉
      await Promise.all([
        mutate(SWR_KEYS.PORTFOLIO),
        mutate(SWR_KEYS.HOLDINGS),
        mutate(SWR_KEYS.HISTORY),
      ]);
      // 重置表单
      setAmount("");
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="币种">
          <select
            className={selectClass}
            value={currency}
            onChange={(e) => setCurrency(e.target.value as "cny" | "aud")}
          >
            <option value="cny">CNY（人民币）</option>
            <option value="aud">AUD（NDQ 子弹）</option>
          </select>
        </Field>
        <Field label="金额" hint="正数；扣到负数会通过（用户调账场景）">
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            className={inputClass}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="例如 1000"
            autoFocus
            required
          />
        </Field>
        {error && <p className="text-sm text-neg">⚠ {error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" type="button" onClick={onClose} disabled={submitting}>
            取消
          </Button>
          <Button variant={mode === "withdraw" ? "danger" : "primary"} type="submit" disabled={submitting}>
            {submitting ? "提交中..." : mode === "deposit" ? "确认存入" : "确认取出"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
