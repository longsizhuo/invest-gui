import { useState } from "react";
import { mutate } from "swr";
import { ApiError, postJSON, type WriteResponse } from "../lib/api-client";
import { SWR_KEYS } from "../lib/swr-keys";
import { Dialog } from "./Dialog";
import { Field, inputClass } from "./Field";
import { Button } from "./Button";

/**
 * 存款 / 取款 通用对话框
 *
 * 走 v2 通用端点 /api/cash/{currency}/deposit|withdraw —— 支持任意币种（后端只校验
 * 3-5 位字母）。旧的 /api/deposit 只收 cny/aud，fork 用户的 US/HK/EU 资产填不了。
 *
 * 提交成功后 mutate /api/portfolio + /api/holdings + /api/history 让页面立即重拉。
 */

/** 常见币种建议（datalist 提示，不限制取值） */
const COMMON_CURRENCIES = ["CNY", "AUD", "USD", "HKD", "EUR", "GBP", "JPY", "SGD"];

export function CashDialog({
  mode,
  open,
  onClose,
}: {
  mode: "deposit" | "withdraw";
  open: boolean;
  onClose: () => void;
}) {
  const [currency, setCurrency] = useState("CNY");
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
    const ccy = currency.trim().toUpperCase();
    if (!/^[A-Z]{3,5}$/.test(ccy)) {
      setError("币种须为 3-5 位字母，如 CNY / USD / AUD");
      return;
    }

    setSubmitting(true);
    try {
      const url =
        mode === "deposit" ? SWR_KEYS.cashDeposit(ccy) : SWR_KEYS.cashWithdraw(ccy);
      await postJSON<{ amount: number }, WriteResponse>(url, { amount: num });
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
        <Field label="币种" hint="任意币种（如 CNY / USD / AUD）">
          <input
            type="text"
            list="cash-currency-options"
            className={inputClass}
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            placeholder="CNY"
            maxLength={5}
            required
          />
          <datalist id="cash-currency-options">
            {COMMON_CURRENCIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field label="金额" hint={mode === "deposit" ? "正数" : "正数；余额不足会被拒绝"}>
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
