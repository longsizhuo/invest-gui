import { AllocationsDialog } from "invest-gui";

// 改 stock/cash 目标分配比例 —— 打开态，初值股票 70% / 现金 30%。
export const Open = () => (
  <AllocationsDialog open onClose={() => {}} stock={0.7} cash={0.3} />
);
