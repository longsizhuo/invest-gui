import { GoldTradeDialog } from "invest-gui";

// Dialog renders via native <dialog>.showModal() into the top layer (overlay).
// Suggest cardMode:single + a viewport so the centered modal + dimmed backdrop
// are captured cleanly. Two modes share one body schema (buy / sell).
export const Buy = () => (
  <div style={{ minHeight: 420 }}>
    <GoldTradeDialog mode="buy" open onClose={() => {}} />
  </div>
);

export const Sell = () => (
  <div style={{ minHeight: 420 }}>
    <GoldTradeDialog mode="sell" open onClose={() => {}} />
  </div>
);
