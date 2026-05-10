import { useState } from "react";
import { mutate } from "swr";
import { recordTrade, ApiError } from "../lib/api-client";
import type { TradeRecordRequest } from "../lib/api-client";
import { SWR_KEYS } from "../lib/swr-keys";
import { Dialog } from "./Dialog";
import { Field, inputClass, selectClass } from "./Field";
import { Button } from "./Button";
import { useToast } from "./Toast";

/**
 * RecordModal — 一键记账 Modal
 *
 * 用途：用户跑完委员会后，点"记一笔"弹出此 modal，确认买/卖数量后写入内部账本。
 * 不连真实支付，仅做内部流水记录。
 *
 * Props:
 * - open: 是否显示
 * - onClose: 关闭回调
 * - defaultSymbol: 预填的资产 symbol（来自委员会决议）
 * - defaultDirection: 预填的方向（来自 verdict：BUY 系列 → BUY，SELL/TRIM → SELL）
 * - verdictId: 关联的决议 ID（可选，用于追溯）
 */
export function RecordModal({
  open,
  onClose,
  defaultSymbol = "",
  defaultDirection = "BUY",
  verdictId,
}: {
  open: boolean;
  onClose: () => void;
  defaultSymbol?: string;
  defaultDirection?: "BUY" | "SELL";
  verdictId?: string;
}) {
  // 表单字段状态
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [direction, setDirection] = useState<"BUY" | "SELL">(defaultDirection);
  const [units, setUnits] = useState("");
  const [price, setPrice] = useState("");
  const [costCurrency, setCostCurrency] = useState("CNY");
  const [note, setNote] = useState("");
  // 二次确认开关：direction 为 SELL 时要求勾选
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { push: toast } = useToast();

  // 每次 open 时重置表单到默认值（避免上次填写残留）
  // 用 key 控制更干净，但这里简单做 reset 就够了
  function handleClose() {
    setSymbol(defaultSymbol);
    setDirection(defaultDirection);
    setUnits("");
    setPrice("");
    setCostCurrency("CNY");
    setNote("");
    setConfirmed(false);
    setError(null);
    onClose();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // 基础校验
    const unitsNum = parseFloat(units);
    if (!unitsNum || unitsNum <= 0) {
      setError("手数必须大于 0");
      return;
    }
    if (!symbol.trim()) {
      setError("资产 symbol 不能为空");
      return;
    }
    // 卖出需要二次确认
    if (direction === "SELL" && !confirmed) {
      setError("卖出操作请勾选确认");
      return;
    }

    const req: TradeRecordRequest = {
      symbol: symbol.trim().toUpperCase(),
      direction,
      units: unitsNum,
      note: note.trim() || undefined,
      cost_currency: costCurrency || undefined,
      verdict_id: verdictId,
    };

    // price 可选
    const priceNum = parseFloat(price);
    if (price.trim() && priceNum > 0) {
      req.price = priceNum;
    }

    setSubmitting(true);
    try {
      await recordTrade(req);
      // 成功后 mutate trades 列表让 Dashboard 即时刷新
      await mutate(SWR_KEYS.TRADES);
      await mutate(SWR_KEYS.TRADES_RECENT);
      // 金融视角红线：用"计划"而非完成时态，避免用户把"意向记录"误认作"成交确认"。
      // status 字段默认 planned；用户在券商真实成交后回来 PATCH /status 改 executed。
      toast(
        `已记录**计划**${direction === "BUY" ? "买入" : "卖出"} ${req.symbol} ×${unitsNum}（记得在券商完成实际操作后回来标记成交）`,
        "info",
      );
      handleClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={`记一笔 — ${direction === "BUY" ? "买入" : "卖出"}`}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {/* 资产 symbol */}
        <Field label="资产 Symbol" hint="例如 NDQ.AX / GC=F / AAPL">
          <input
            type="text"
            className={inputClass}
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="NDQ.AX"
            autoFocus
            required
          />
        </Field>

        {/* 方向 toggle —— BUY / SELL 用对比色强化认知 */}
        <Field label="方向">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setDirection("BUY"); setConfirmed(false); }}
              className={
                "flex-1 h-10 text-sm font-medium border transition-colors duration-100 " +
                (direction === "BUY"
                  ? "bg-[var(--pos)] text-[var(--surface-base)] border-[var(--pos)]"
                  : "bg-transparent text-[var(--text-secondary)] border-[var(--border-strong)] hover:border-[var(--pos)] hover:text-[var(--pos)]")
              }
            >
              买入 BUY
            </button>
            <button
              type="button"
              onClick={() => { setDirection("SELL"); setConfirmed(false); }}
              className={
                "flex-1 h-10 text-sm font-medium border transition-colors duration-100 " +
                (direction === "SELL"
                  ? "bg-[var(--neg)] text-[var(--surface-base)] border-[var(--neg)]"
                  : "bg-transparent text-[var(--text-secondary)] border-[var(--border-strong)] hover:border-[var(--neg)] hover:text-[var(--neg)]")
              }
            >
              卖出 SELL
            </button>
          </div>
        </Field>

        {/* 手数 */}
        <Field label="手数 / 份数" hint="正数，例如买 10 份 NDQ.AX 就填 10">
          <input
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            className={inputClass}
            value={units}
            onChange={(e) => setUnits(e.target.value)}
            placeholder="例如 10"
            required
          />
        </Field>

        {/* 成交价（可选） */}
        <Field label="成交价（可选）" hint="不填则只记数量，不计成本">
          <div className="flex gap-2">
            <input
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              className={inputClass}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="例如 31.50"
            />
            <select
              className={`${selectClass} w-28 shrink-0`}
              value={costCurrency}
              onChange={(e) => setCostCurrency(e.target.value)}
            >
              <option value="CNY">CNY</option>
              <option value="AUD">AUD</option>
              <option value="USD">USD</option>
              <option value="HKD">HKD</option>
            </select>
          </div>
        </Field>

        {/* 备注 */}
        <Field label="备注（可选）">
          <textarea
            className={`${inputClass} resize-none`}
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="例如：委员会 BUY 建议，分批第一笔"
          />
        </Field>

        {/* 卖出二次确认 —— 破坏性操作加一道心理防线 */}
        {direction === "SELL" && (
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 accent-[var(--neg)]"
            />
            <span className="text-[var(--neg)]">
              我确认这是一笔卖出记录，不可自动撤销
            </span>
          </label>
        )}

        {/* 错误提示 */}
        {error && (
          <p className="text-sm text-neg border border-[var(--neg)] px-3 py-2">
            {error}
          </p>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" type="button" onClick={handleClose} disabled={submitting}>
            取消
          </Button>
          <Button
            variant={direction === "SELL" ? "danger" : "primary"}
            type="submit"
            disabled={submitting || (direction === "SELL" && !confirmed)}
          >
            {submitting
              ? "提交中..."
              : direction === "BUY"
                ? "确认买入记录"
                : "确认卖出记录"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
