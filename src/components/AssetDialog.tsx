import { useState, useEffect } from "react";
import { mutate } from "swr";
import {
  ApiError,
  postJSON,
  putJSON,
  deleteJSON,
  type StrategyWriteResponse,
  type TargetAsset,
  type TargetAssetCreate,
  type TargetAssetPatch,
} from "../lib/api-client";
import { Dialog } from "./Dialog";
import { Field, inputClass } from "./Field";
import { Button } from "./Button";

type Mode = "create" | "edit";

/**
 * 单个 target_asset 的新增 / 编辑对话框
 *
 * 编辑模式下显示删除按钮（确认后调 DELETE）；
 * schema 至少保留 1 个 asset，删到只剩自己时后端会 400 阻止。
 */
export function AssetDialog({
  mode,
  open,
  onClose,
  asset,
}: {
  mode: Mode;
  open: boolean;
  onClose: () => void;
  asset?: TargetAsset; // edit 模式必传
}) {
  const [symbol, setSymbol] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [channel, setChannel] = useState("");
  const [maxCap, setMaxCap] = useState("");
  const [offsetPct, setOffsetPct] = useState("");
  const [feePct, setFeePct] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 打开时填初值（edit 模式）
  useEffect(() => {
    if (!open) return;
    setError(null);
    if (mode === "edit" && asset) {
      setSymbol(asset.symbol);
      setDisplayName(asset.display_name ?? "");
      setChannel(asset.channel ?? "");
      setMaxCap(String(asset.max_single_invest_cny));
      setOffsetPct(asset.price_offset_pct != null ? String(asset.price_offset_pct * 100) : "");
      setFeePct(asset.sell_fee_pct != null ? String(asset.sell_fee_pct * 100) : "");
    } else {
      setSymbol("");
      setDisplayName("");
      setChannel("");
      setMaxCap("");
      setOffsetPct("");
      setFeePct("");
    }
  }, [open, mode, asset]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cap = parseFloat(maxCap);
    if (Number.isNaN(cap) || cap < 0) return setError("单次上限必须 ≥ 0");

    // 把 % 转回 0-1 小数；空串视为不设置（null）
    const off = offsetPct.trim() === "" ? null : parseFloat(offsetPct) / 100;
    const fee = feePct.trim() === "" ? null : parseFloat(feePct) / 100;
    if (off != null && (off < -0.1 || off > 0.1)) return setError("点差必须在 ±10% 内");
    if (fee != null && (fee < 0 || fee > 0.05)) return setError("手续费必须在 0~5%");

    setSubmitting(true);
    try {
      if (mode === "create") {
        const body: TargetAssetCreate = {
          symbol: symbol.trim(),
          display_name: displayName.trim() || null,
          channel: channel.trim() || null,
          max_single_invest_cny: cap,
          price_offset_pct: off,
          sell_fee_pct: fee,
        };
        await postJSON<TargetAssetCreate, StrategyWriteResponse>("/api/strategy/asset", body);
      } else {
        const body: TargetAssetPatch = {
          display_name: displayName.trim() || null,
          channel: channel.trim() || null,
          max_single_invest_cny: cap,
          price_offset_pct: off,
          sell_fee_pct: fee,
        };
        await putJSON<TargetAssetPatch, StrategyWriteResponse>(
          `/api/strategy/asset/${encodeURIComponent(symbol)}`,
          body,
        );
      }
      await mutate("/api/strategy");
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete() {
    if (mode !== "edit" || !asset) return;
    if (!window.confirm(`确认删除 ${asset.symbol}？schema 要求至少保留 1 个 asset。`)) return;
    setError(null);
    setSubmitting(true);
    try {
      await deleteJSON<StrategyWriteResponse>(
        `/api/strategy/asset/${encodeURIComponent(asset.symbol)}`,
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
    <Dialog
      open={open}
      onClose={onClose}
      title={mode === "create" ? "新增 target_asset" : `编辑 ${asset?.symbol ?? ""}`}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="symbol" hint={mode === "edit" ? "不可改（如需改 symbol 请先删除再新增）" : "如 NDQ.AX, GC=F, VAS.AX"}>
          <input
            type="text"
            className={inputClass}
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            disabled={mode === "edit"}
            autoFocus={mode === "create"}
            required
          />
        </Field>
        <Field label="显示名">
          <input
            type="text"
            className={inputClass}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="如 BetaShares Nasdaq 100 ETF"
          />
        </Field>
        <Field label="渠道">
          <input
            type="text"
            className={inputClass}
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            placeholder="如 CommSec / 浙商积存金"
          />
        </Field>
        <Field label="单次投资上限 (CNY)">
          <input
            type="number"
            min="0"
            step="100"
            className={inputClass}
            value={maxCap}
            onChange={(e) => setMaxCap(e.target.value)}
            required
          />
        </Field>
        <Field label="渠道点差 (%)" hint="±10% 内；空 = 不设置">
          <input
            type="number"
            step="0.01"
            min="-10"
            max="10"
            className={inputClass}
            value={offsetPct}
            onChange={(e) => setOffsetPct(e.target.value)}
            placeholder="例如 0.5 表示溢价 0.5%"
          />
        </Field>
        <Field label="卖出手续费 (%)" hint="0-5% 内；空 = 不设置">
          <input
            type="number"
            step="0.01"
            min="0"
            max="5"
            className={inputClass}
            value={feePct}
            onChange={(e) => setFeePct(e.target.value)}
            placeholder="例如 0.38"
          />
        </Field>

        {error && <p className="text-sm text-red-400">⚠ {error}</p>}

        <div className="flex justify-between items-center pt-2">
          <div>
            {mode === "edit" && (
              <Button variant="danger" type="button" onClick={onDelete} disabled={submitting}>
                删除
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" type="button" onClick={onClose} disabled={submitting}>
              取消
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "提交中..." : "保存"}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
