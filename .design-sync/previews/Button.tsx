import { Button } from "invest-gui";

export const Variants = () => (
  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
    <Button variant="primary">Buy NDQ.AX</Button>
    <Button variant="outline">Add to watchlist</Button>
    <Button variant="ghost">Cancel</Button>
    <Button variant="danger">Sell all</Button>
  </div>
);

export const Sizes = () => (
  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
    <Button size="sm" variant="primary">Small</Button>
    <Button size="md" variant="primary">Medium</Button>
    <Button size="sm" variant="outline">Small</Button>
    <Button size="md" variant="outline">Medium</Button>
  </div>
);

export const Disabled = () => (
  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
    <Button variant="primary" disabled>Run committee</Button>
    <Button variant="danger" disabled>Sell all</Button>
  </div>
);
