import { DashboardHero } from "invest-gui";

// FLAG data-bound: DashboardHero fetches /api/portfolio/total_value +
// committee sessions + user profile via SWR internally — there is no prop
// override. In previews the SWR cache is empty (no backend), so it renders its
// graceful degraded landmark: total assets fall back to "¥—" placeholders, the
// committee column shows "尚无记录" with the trigger CTA, and the wealth-context
// chips hide. This is the real static state a fresh/offline install shows.

export const Landmark = () => (
  <div style={{ width: 920 }}>
    <DashboardHero />
  </div>
);
