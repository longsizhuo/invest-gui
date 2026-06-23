import { OutperformShareCard } from "invest-gui";

// OutperformShareCard fetches GET /api/outperform_events and renders null when
// there are no events. The provider (DSPreviewProvider) seeds SWR's fallback for
// that key — bundled with the components so its context actually reaches the
// component's useSWR — so this renders the real "beat-the-benchmark" share banner.
export const Banner = () => (
  <div style={{ width: 480 }}>
    <OutperformShareCard />
  </div>
);
