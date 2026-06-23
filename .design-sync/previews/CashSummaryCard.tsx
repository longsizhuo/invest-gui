import { CashSummaryCard } from "invest-gui";

export const MultiCurrency = () => (
  <div style={{ width: 360 }}>
    <CashSummaryCard cash={{ CNY: 48200, AUD: 1150.5, USD: 2030.75 }} />
  </div>
);

export const WithZeroBalance = () => (
  <div style={{ width: 360 }}>
    <CashSummaryCard cash={{ CNY: 225378.4, AUD: 0, USD: 0, HKD: 980.2 }} />
  </div>
);

export const Empty = () => (
  <div style={{ width: 360 }}>
    <CashSummaryCard cash={{}} />
  </div>
);
