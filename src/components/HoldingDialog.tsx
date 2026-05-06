import { useState, useEffect } from "react";
import { mutate } from "swr";
import {
  ApiError,
  postJSON,
  putJSON,
  deleteJSON,
  type HoldingV2,
} from "../lib/api-client";
import { Dialog } from "./Dialog";
import { Field, inputClass, selectClass } from "./Field";
import { Button } from "./Button";
import { SymbolSearch } from "./SymbolSearch";

type Mode = "create" | "edit";

const KIND_OPTIONS = [
  { v: "equity", label: "股票" },
  { v: "etf", label: "ETF" },
  { v: "metal", label: "贵金属" },
  { v: "crypto", label: "加密货币" },
  { v: "bond", label: "债券" },
  { v: "fund", label: "基金" },
  { v: "other", label: "其他" },
];

/**
 * 通用 holding CRUD 对话框（v2）
 *
 * 新增：含 symbol 搜索框 + 完整字段输入
 * 编辑：禁止改 symbol（要改先删再加），其他字段都可改
 *
 * 提交后 mutate /api/holdings 让主面板立即重拉
 */
export function HoldingDialog({
  mode,
  open,
  onClose,
  holding,
}: {
  mode: Mode;
  open: boolean;
  onClose: () => void;
  holding?: HoldingV2;
}) {
  const [symbol, setSymbol] = useState("");
  const [kind, setKind] = useState("equity");
  const [units, setUnits] = useState("");
  const [unitLabel, setUnitLabel] = useState("股");
  const [avgCost, setAvgCost] = useState("");
  const [costCurrency, setCostCurrency] = useState("USD");
  const [channel, setChannel] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isTracking, setIsTracking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (mode === "edit" && holding) {
      setSymbol(holding.symbol);
      setKind(holding.kind);
      setUnits(String(holding.units));
      setUnitLabel(holding.unit_label);
      setAvgCost(String(holding.avg_cost));
      setCostCurrency(holding.cost_currency);
      setChannel(holding.channel ?? "");
      setDisplayName(holding.display_name ?? "");
      setIsTracking(holding.is_tracking_only);
    } else {
      setSymbol("");
      setKind("equity");
      setUnits("");
      setUnitLabel("股");
      setAvgCost("");
      setCostCurrency("USD");
      setChannel("");
      setDisplayName("");
      setIsTracking(false);
    }
  }, [open, mode, holding]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!symbol.trim()) return setError("请填 symbol（或从搜索框选择）");

    const u = parseFloat(units || "0");
    const ac = parseFloat(avgCost || "0");
    if (Number.isNaN(u) || u < 0) return setError("持仓数 >= 0");
    if (Number.isNaN(ac) || ac < 0) return setError("均价 >= 0");
    if (!isTracking && u > 0 && ac === 0) {
      return setError("实仓必须有均价（追踪仓除外）");
    }

    setSubmitting(true);
    try {
      const payload = {
        symbol: symbol.trim(),
        kind,
        units: u,
        unit_label: unitLabel || "share",
        avg_cost: ac,
        cost_currency: costCurrency.toUpperCase(),
        channel: channel.trim() || null,
        display_name: displayName.trim() || null,
        is_tracking_only: isTracking,
      };
      if (mode === "create") {
        await postJSON("/api/holdings", payload);
      } else {
        // 编辑：不能改 symbol
        const { symbol: _ignored, ...patch } = payload;
        await putJSON(`/api/holdings/${encodeURIComponent(symbol)}`, patch);
      }
      await mutate("/api/holdings");
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete() {
    if (mode !== "edit" || !holding) return;
    if (!window.confirm(`确认删除 ${holding.symbol}？`)) return;
    setError(null);
    setSubmitting(true);
    try {
      await deleteJSON(`/api/holdings/${encodeURIComponent(symbol)}`);
      await mutate("/api/holdings");
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
      title={mode === "create" ? "新增资产" : `编辑 ${holding?.symbol ?? ""}`}
    >
      <form onSubmit={onSubmit} className="space-y-3">
        <Field
          label="Symbol"
          hint={mode === "edit" ? "不可改（如需改 symbol 请删除后新增）" : "搜索或直接输入 yfinance symbol"}
        >
          {mode === "create" ? (
            <SymbolSearch
              value={symbol}
              onChange={setSymbol}
              onSelect={(hit) => {
                setSymbol(hit.symbol);
                if (hit.shortname || hit.longname) {
                  setDisplayName(hit.shortname ?? hit.longname ?? "");
                }
                // 启发式 kind
                if (hit.quote_type === "ETF") setKind("etf");
                else if (hit.quote_type === "EQUITY") setKind("equity");
                else if (hit.quote_type === "CRYPTOCURRENCY") setKind("crypto");
                else if (hit.quote_type === "MUTUALFUND") setKind("fund");
              }}
              autoFocus
            />
          ) : (
            <input className={inputClass} value={symbol} disabled />
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="资产类型">
            <select className={selectClass} value={kind} onChange={(e) => setKind(e.target.value)}>
              {KIND_OPTIONS.map((o) => (
                <option key={o.v} value={o.v}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="计价币种">
            <input
              className={inputClass + " uppercase"}
              value={costCurrency}
              onChange={(e) => setCostCurrency(e.target.value.toUpperCase())}
              maxLength={5}
              required
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="持仓数量" hint="追踪仓填 0">
            <input
              type="number" step="0.0001" min="0"
              className={inputClass} value={units}
              onChange={(e) => setUnits(e.target.value)}
            />
          </Field>
          <Field label="单位" hint="股 / 克 / oz / 张">
            <input
              className={inputClass} value={unitLabel}
              onChange={(e) => setUnitLabel(e.target.value)}
              maxLength={8}
            />
          </Field>
        </div>

        <Field label="加权均价" hint={`${costCurrency}/${unitLabel || "单位"}（追踪仓不需要）`}>
          <input
            type="number" step="0.01" min="0"
            className={inputClass} value={avgCost}
            onChange={(e) => setAvgCost(e.target.value)}
          />
        </Field>

        <Field label="显示名">
          <input
            className={inputClass} value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="如 Apple Inc."
          />
        </Field>

        <Field label="渠道">
          <input
            className={inputClass} value={channel}
            onChange={(e) => setChannel(e.target.value)}
            placeholder="如 CommSec / 浙商银行"
          />
        </Field>

        <label className="flex items-center gap-2 pt-1">
          <input
            type="checkbox" checked={isTracking}
            onChange={(e) => setIsTracking(e.target.checked)}
          />
          <span className="text-sm text-[var(--text-primary)]">
            🔍 追踪仓（仅观察，不计 P&L；适合先看看再买）
          </span>
        </label>

        {error && <p className="text-sm text-neg">⚠ {error}</p>}

        <div className="flex justify-between items-center pt-3">
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
              {submitting ? "提交中..." : mode === "create" ? "新增" : "保存"}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
