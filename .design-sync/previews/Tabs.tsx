import { Tabs, Card, Row } from "invest-gui";

export const PortfolioTabs = () => (
  <div style={{ width: 560 }}>
    <Tabs
      defaultId="holdings"
      tabs={[
        {
          id: "holdings",
          label: "持仓",
          render: () => (
            <Card title="NDQ.AX" subtitle="BetaShares Nasdaq 100 ETF">
              <Row label="Shares" value="120" />
              <Row label="Market value" value="A$4,812.00" />
              <Row
                label="Unrealised P&L"
                value={<span style={{ color: "var(--pos)" }}>+A$960.00</span>}
              />
            </Card>
          ),
        },
        {
          id: "cash",
          label: "现金",
          render: () => (
            <Card title="Cash" subtitle="Across 3 currencies">
              <Row label="CNY" value="¥48,200.00" />
              <Row label="AUD" value="A$1,150.00" />
              <Row label="USD" value="$2,030.00" />
            </Card>
          ),
        },
        {
          id: "committee",
          label: "委员会",
          hint: "4 角色 LLM 投资委员会最新决议",
          render: () => (
            <Card title="最新决议" subtitle="AAPL · 2026-06-22">
              <Row
                label="Verdict"
                value={<span style={{ color: "var(--pos)" }}>BUY</span>}
              />
              <Row label="Conviction" value="7 / 10" />
            </Card>
          ),
        },
      ]}
    />
  </div>
);

export const RoleTabs = () => (
  <div style={{ width: 560 }}>
    <Tabs
      defaultId="cio"
      tabs={[
        { id: "macro", label: "macro", render: () => <RoleNote text="美债利率见顶，风险偏好回升，对成长资产中性偏多。" /> },
        { id: "quant", label: "quant", render: () => <RoleNote text="动量分位 78，波动率收敛，趋势有效；回撤止损位 -8%。" /> },
        { id: "risk", label: "risk", render: () => <RoleNote text="单一标的集中度 21%，超过 20% 软上限，建议分批。" /> },
        { id: "cio", label: "cio", render: () => <RoleNote text="综合采纳：小仓位 BUY，分两笔建仓，复核集中度。" /> },
      ]}
    />
  </div>
);

const RoleNote = ({ text }: { text: string }) => (
  <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
    {text}
  </p>
);
