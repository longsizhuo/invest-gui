import { StatusBadge } from "invest-gui";

export const Statuses = () => (
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
    <StatusBadge status="queued" />
    <StatusBadge status="running" />
    <StatusBadge status="done" />
    <StatusBadge status="error" />
  </div>
);
