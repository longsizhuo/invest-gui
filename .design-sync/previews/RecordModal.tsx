import { RecordModal } from "invest-gui";

// 一键记账 —— 买入态（委员会 BUY 决议后预填 symbol + 方向）。
export const Buy = () => (
  <RecordModal
    open
    onClose={() => {}}
    defaultSymbol="NDQ.AX"
    defaultDirection="BUY"
    verdictId="vd_2026-06-23_NDQ"
  />
);

// 卖出态 —— danger 按钮 + 二次确认勾选。
export const Sell = () => (
  <RecordModal
    open
    onClose={() => {}}
    defaultSymbol="AAPL"
    defaultDirection="SELL"
  />
);
