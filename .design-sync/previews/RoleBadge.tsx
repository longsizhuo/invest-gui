import { RoleBadge } from "invest-gui";

export const Roles = () => (
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
    <RoleBadge role="macro" />
    <RoleBadge role="quant" />
    <RoleBadge role="risk" />
    <RoleBadge role="cio" />
  </div>
);
