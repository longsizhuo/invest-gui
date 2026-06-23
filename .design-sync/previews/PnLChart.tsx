import { PnLChart } from "invest-gui";

// Chart/external: PnLChart renders an <img src="/api/pnl_chart.svg">, a
// backend-generated SVG with no static fallback in previews. The image will
// 404 → onError flips to the "未生成" placeholder card. Candidate for skip/floor.
export const Default = () => (
  <div style={{ width: 520 }}>
    <PnLChart />
  </div>
);
