import { Card, Row } from "invest-gui";

export const Holding = () => (
  <div style={{ width: 360 }}>
    <Card title="NDQ.AX" subtitle="BetaShares Nasdaq 100 ETF">
      <Row label="Shares" value="120" />
      <Row label="Avg cost" value="A$32.10" />
      <Row label="Market value" value="A$4,812.00" />
      <Row
        label="Unrealised P&L"
        value={<span style={{ color: "var(--pos)" }}>+A$960.00</span>}
      />
    </Card>
  </div>
);

export const WithActions = () => (
  <div style={{ width: 360 }}>
    <Card
      title="Cash"
      subtitle="Across 3 currencies"
      actions={<span style={{ color: "var(--text-tertiary)", fontSize: 12 }}>as of today</span>}
    >
      <Row label="CNY" value="¥48,200" />
      <Row label="AUD" value="A$1,150" />
      <Row label="USD" value="$2,030" />
    </Card>
  </div>
);

export const Plain = () => (
  <div style={{ width: 360 }}>
    <Card>
      <Row label="Total assets" value="¥225,378" />
      <Row label="Day change" value={<span style={{ color: "var(--neg)" }}>−¥1,204</span>} />
    </Card>
  </div>
);
