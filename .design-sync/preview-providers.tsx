/**
 * Preview-only provider chain for design-sync.
 *
 * invest-gui's components read several React contexts — privacy mask
 * (usePrivacy), toasts (useToast), SWR data, and the router. This composes
 * them so authored preview cards render instead of throwing
 * "must be used within a Provider". It is NOT part of the shipped app; it only
 * exists to give the design-sync preview harness the context the components
 * expect. Wired in via cfg.extraEntries + cfg.provider.component.
 */
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { SWRConfig } from "swr";
import { PrivacyProvider } from "../src/lib/privacy";
import { ToastProvider } from "../src/components/Toast";

// invest-gui is a DARK-themed DS: the real app paints the page from
// `body { background: var(--surface-base) }` (src/index.css), and components
// like Button/badges are transparent/light-on-dark by design — they only read
// correctly on that dark surface. Preview cards don't inherit the app body, so
// we replicate the app shell here (surface-base bg + text-primary + ui font).
// This is the same visual context a design built with this DS renders in.
export function DSPreviewProvider({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <SWRConfig
        value={{
          provider: () => new Map(),
          dedupingInterval: 0,
          // No backend in previews. Disable revalidation so seeded data sticks
          // and components show a stable frame instead of a failed-fetch flash.
          revalidateOnMount: false,
          revalidateIfStale: false,
          // Seed the few cards that render null without data so they show their
          // real populated state (the component's own data path, not faked markup).
          // This provider is bundled WITH the components (cfg.extraEntries), so its
          // SWR context actually reaches their useSWR — a preview-file SWRConfig
          // can't (separate bundle = separate swr instance).
          fallback: {
            "/api/outperform_events": {
              events: [
                { benchmark: "ASX 200", diff_pct: 3.42, label: "openInvest 组合近 30 天跑赢 ASX 200 +3.42%" },
              ],
            },
          },
        }}
      >
        <PrivacyProvider>
          <ToastProvider>
            <div
              style={{
                background: "var(--surface-base)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-ui)",
                padding: 24,
              }}
            >
              {children}
            </div>
          </ToastProvider>
        </PrivacyProvider>
      </SWRConfig>
    </MemoryRouter>
  );
}
