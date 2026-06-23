import { GoldOffsetDialog } from "invest-gui";

// Dialog renders via native <dialog>.showModal() into the top layer (overlay).
// Suggest cardMode:single + a viewport so the centered modal + dimmed backdrop
// are captured cleanly.
export const Open = () => (
  <div style={{ minHeight: 360 }}>
    <GoldOffsetDialog open onClose={() => {}} />
  </div>
);
