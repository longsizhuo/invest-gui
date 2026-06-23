import { VerdictBadge } from "invest-gui";

export const Verdicts = () => (
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
    <VerdictBadge verdict="BUY" />
    <VerdictBadge verdict="ACCUMULATE" />
    <VerdictBadge verdict="HOLD" />
    <VerdictBadge verdict="TRIM" />
    <VerdictBadge verdict="SELL" />
  </div>
);

export const Empty = () => (
  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
    <VerdictBadge verdict={null} />
  </div>
);
