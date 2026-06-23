import { HoldingCard } from "invest-gui";

// HoldingV2 is the GET /api/holdings row shape (api-types.ts). Authored as full
// literals so the card renders without a backend (component is otherwise pure).
// Local alias rather than importing the type — the synth-mode "invest-gui" entry
// only re-exports components, not lib types.
type HoldingV2 = Parameters<typeof HoldingCard>[0]["h"];

const ndq: HoldingV2 = {
  symbol: "NDQ.AX",
  kind: "etf",
  units: 120,
  unit_label: "股",
  avg_cost: 32.1,
  cost_currency: "AUD",
  channel: "CommSec",
  display_name: "BetaShares Nasdaq 100 ETF",
  yfinance_proxy: null,
  proxy_kind: "direct",
  price_offset_pct: null,
  sell_fee_pct: null,
  is_tracking_only: false,
  quote: {
    price: 40.12,
    currency: "AUD",
    unit: "股",
    last_updated: "2026-06-23",
    is_stale: false,
    extra: { day_change_pct: 1.34 },
  },
  market_value: 4814.4,
  pnl: 962.4,
};

const aapl: HoldingV2 = {
  symbol: "AAPL",
  kind: "stock",
  units: 35,
  unit_label: "股",
  avg_cost: 214.5,
  cost_currency: "USD",
  channel: "IBKR",
  display_name: "Apple Inc.",
  yfinance_proxy: null,
  proxy_kind: "direct",
  price_offset_pct: null,
  sell_fee_pct: null,
  is_tracking_only: false,
  quote: {
    price: 198.7,
    currency: "USD",
    unit: "股",
    last_updated: "2026-06-23",
    is_stale: false,
    extra: { day_change_pct: -0.82 },
  },
  market_value: 6954.5,
  pnl: -553.0,
};

const gold: HoldingV2 = {
  symbol: "GC=F",
  kind: "commodity",
  units: 50.5,
  unit_label: "克",
  avg_cost: 612.4,
  cost_currency: "CNY",
  channel: "招商银行",
  display_name: "黄金（积存金）",
  yfinance_proxy: "GC=F",
  proxy_kind: "proxy",
  price_offset_pct: null,
  sell_fee_pct: null,
  is_tracking_only: false,
  quote: {
    price: 648.9,
    currency: "CNY",
    unit: "克",
    last_updated: "2026-06-20",
    is_stale: true,
    extra: { day_change_pct: 0.21 },
  },
  market_value: 32769.45,
  pnl: 1843.25,
};

const tracking: HoldingV2 = {
  symbol: "TSLA",
  kind: "stock",
  units: 0,
  unit_label: "股",
  avg_cost: 0,
  cost_currency: "USD",
  channel: null,
  display_name: "Tesla, Inc.",
  yfinance_proxy: null,
  proxy_kind: "direct",
  price_offset_pct: null,
  sell_fee_pct: null,
  is_tracking_only: true,
  quote: {
    price: 331.2,
    currency: "USD",
    unit: "股",
    last_updated: "2026-06-23",
    is_stale: false,
    extra: { day_change_pct: 2.05 },
  },
  market_value: null,
  pnl: null,
};

export const Profit = () => (
  <div style={{ width: 360 }}>
    <HoldingCard h={ndq} />
  </div>
);

export const Loss = () => (
  <div style={{ width: 360 }}>
    <HoldingCard h={aapl} />
  </div>
);

export const CommodityStale = () => (
  <div style={{ width: 360 }}>
    <HoldingCard h={gold} />
  </div>
);

export const TrackingOnly = () => (
  <div style={{ width: 360 }}>
    <HoldingCard h={tracking} />
  </div>
);
