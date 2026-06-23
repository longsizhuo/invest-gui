# design-sync notes — invest-gui

invest-gui is a React **app** (Vite), not a published component library. It has no
Storybook and no `dist/` entry, so this syncs in **package shape, synth-entry mode**
(the converter synthesizes an entry from `src/components/` and extracts props from the
`.tsx` sources via ts-morph). Project: `invest-gui` (claude.ai/design).

## Setup (reproduced by cfg.buildCmd = `bash .design-sync/build-css.sh`)
invest-gui IS the package (repo root), not an installed dependency, so the converter's
`PKG_DIR = node_modules/invest-gui` doesn't exist. `build-css.sh`:
1. builds `.ds-sync/pkgroot/` — an isolated package root that symlinks
   `package.json` / `src` / `tsconfig.json` / `.design-sync` but has **no nested
   node_modules** (a whole-repo symlink makes ts-morph's descendant walk loop forever:
   `node_modules/invest-gui/node_modules/invest-gui/…` → ELOOP).
2. points `node_modules/invest-gui` → `.ds-sync/pkgroot`.
3. compiles Tailwind (reads the repo's own `tailwind.config.js`, `content: ./src/**`) →
   `.ds-sync/pkgroot/ds-tailwind.css`, with the app's Google Fonts `@import` prepended.
   Emitted as a **real file inside pkgroot** because `cfg.cssEntry` must stay within
   PKG_DIR's realpath — under the `.design-sync` symlink it escapes and gets skipped.

## Build / validate commands (from repo root)
```
bash .design-sync/build-css.sh
node .ds-sync/package-build.mjs --config .design-sync/config.json --node-modules ./node_modules --out ./ds-bundle
DS_CHROMIUM_PATH=/home/ubuntu/.cache/ms-playwright/chromium-1223/chrome-linux/chrome \
  node .ds-sync/package-validate.mjs ./ds-bundle
```
- playwright 1.60.0 installed into `.ds-sync` (pins chromium build 1223, already cached at
  `~/.cache/ms-playwright/chromium-1223`). `DS_CHROMIUM_PATH` points the render check at it.

## Component discovery
- 25 components auto-derived from `src/components/` (23 files; multi-export files add
  `Card`→`Row`, `StatusBadge`→`VerdictBadge`/`RoleBadge`).
- **Do NOT add non-null `componentSrcMap` entries** in synth mode — any non-null entry
  suppresses the auto-derive fallback and collapses discovery to only the pinned names.
  Keep `componentSrcMap` to `{ "ToastProvider": null }` (excludes the infra provider card).
- `Row` / `VerdictBadge` / `RoleBadge` are secondary exports (filename ≠ name) so they're
  not src-matched (no auto-JSDoc/group) — fine, their previews are authored.

## Preview authoring conventions
- `import { X } from "invest-gui"` (story-imports redirects to `window.InvestGui`).
- `cfg.provider` (DSPreviewProvider) **auto-wraps every preview** — do NOT wrap manually.
- **Dark theme**: invest-gui is dark (`body { background: var(--surface-base) }`).
  Button/badges are transparent/light-on-dark and vanish on a white card, so
  `DSPreviewProvider` (`.design-sync/preview-providers.tsx`) wraps children in a
  `surface-base` dark div — all previews inherit it. `Card` self-paints `surface-raised`.
- Use **inline styles** for layout glue and any added color. Arbitrary Tailwind classes
  like `text-[var(--pos)]` are NOT in the compiled CSS (Tailwind only emits what it scans
  in src) → use `style={{ color: "var(--pos)" }}`. Custom classes `chip-pos/warn/neg`
  (defined in `src/index.css`) ARE compiled and safe to rely on.
- Provider chain available to previews: MemoryRouter → SWRConfig(empty Map) → Privacy →
  Toast. Data-bound components (dialogs, SymbolSearch) have no backend in previews — author
  them with explicit props, not by relying on a fetch.

## Card-mode overrides (cfg.overrides) — why each
- Overlay dialogs use native `<dialog>.showModal()` (top layer) → escape the grid →
  `{cardMode: "single", primaryStory: "<X>"}`: Dialog, AllocationsDialog, AssetDialog,
  CashDialog, GoldOffsetDialog, GoldTradeDialog, HoldingDialog, RecordModal.
- Wide cards/panels render wider than a grid cell → `{cardMode: "column"}`: Button, Card,
  Row, Field, Tabs, CashSummaryCard, HoldingCard, CommitteeRolesPanel, PipelineFlow,
  DashboardHero, SymbolSearch.
- `cfg.overrides.<C>.skip` is an **array of story names**, NOT a boolean — `skip: true`
  crashes `new Set(true)` in emit.mjs. To drop a whole component, delete its preview
  (it floor-cards) rather than skip.

## Two floor-card components (no preview — honest baseline)
- **TradingViewChart**: injects the external `s3.tradingview.com/tv.js` widget; never
  renders statically. Typographic floor card.
- (OutperformShareCard was nearly floored — see SWR-fallback trick below — now authored.)

## Tricky-preview techniques (reuse these)
- **motion/react entrance animations** (PipelineFlow): `initial={{opacity:0}}` leaves a
  blank static screenshot. `MotionConfig reducedMotion="always"` did NOT fix it (opacity
  animations are kept). Fix = scoped CSS in the preview forcing the settled frame:
  `.ds-pf-fix [style*="opacity"]{opacity:1!important} .ds-pf-fix [style*="transform"]{transform:none!important}`.
- **SWR data-bound cards that render null without a backend** (OutperformShareCard): seed
  SWR's `fallback` for the component's key. CRITICAL: the fallback MUST go in
  `DSPreviewProvider` (preview-providers.tsx, bundled WITH the components via extraEntries),
  NOT in the preview file — preview files are a separate esbuild bundle = a different `swr`
  instance, so their SWRConfig context never reaches the component's `useSWR`. The provider
  also sets `revalidateOnMount/IfStale: false` so seeded data sticks. Add a key+shape to the
  provider's `fallback` map to populate any other null-without-data card.
- DashboardHero / PnLChart / SymbolSearch render their real offline/empty states (no
  backend) — graded good as honest degraded views, not failures.

## Known render warns (triaged — not new on re-sync)
- `[FONT_REMOTE]` for "Inter" / "JetBrains Mono" / "Playfair Display" / CJK fallbacks —
  remote Google Fonts `@import`; loads at runtime. Expected.
- tokens: 3 referenced-but-undefined, below threshold (non-blocking).

## Re-sync risks
- `.ds-sync/pkgroot`, `node_modules/invest-gui` symlink, `.ds-sync/pkgroot/ds-tailwind.css`,
  and playwright in `.ds-sync` are all gitignored. On a fresh clone: `pnpm i`, reinstall
  `playwright@1.60.0` into `.ds-sync`, then `cfg.buildCmd` recreates pkgroot + the CSS.
- Compiled CSS is regenerated each run from `src/index.css` + `tailwind.config.js`; if the
  app's tokens/utilities change, re-run `build-css.sh` before the converter (buildCmd does).
- Data-bound previews are authored with hardcoded sample props; if a component's prop shape
  changes upstream, its preview props may drift — re-grade those on re-sync.
