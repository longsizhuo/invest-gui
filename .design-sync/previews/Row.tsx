import { Row } from "invest-gui";

export const Rows = () => (
  <div style={{ width: 360 }}>
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Row label="Shares" value="120" />
      <Row label="Avg cost" value="A$32.10" />
      <Row label="Market value" value="A$4,812.00" />
      <Row
        label="Unrealised P&L"
        value={<span style={{ color: "var(--pos)" }}>+A$960.00</span>}
      />
      <Row
        label="Day change"
        value={<span style={{ color: "var(--neg)" }}>−A$42.30</span>}
      />
    </div>
  </div>
);

export const Verdict = () => (
  <div style={{ width: 360 }}>
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Row label="Symbol" value="AAPL" />
      <Row
        label="Verdict"
        value={<span style={{ color: "var(--pos)" }}>BUY</span>}
      />
      <Row label="Conviction" value="7 / 10" />
      <Row
        label="Concentration"
        value={<span style={{ color: "var(--warn)" }}>21%</span>}
      />
    </div>
  </div>
);
