# invest-gui — how to build with this design system

invest-gui is a **dark-themed financial dashboard** kit (an AI investment-committee
GUI). Components are light-on-dark and read correctly only on the app's dark surface.

## 1. Always paint the dark surface first
The app paints the page from the body: `background: var(--surface-base)` (near-black
`#0a0a0b`), `color: var(--text-primary)`. Components like `Button` and the badges are
transparent/light by design — on a white background they vanish. Wrap every screen in a
root that sets the dark surface, e.g.:

```jsx
<div style={{ minHeight: "100vh", background: "var(--surface-base)", color: "var(--text-primary)", fontFamily: "var(--font-ui)" }}>
  {/* compose components here */}
</div>
```

Most components are pure presentational (no provider needed): `Card`/`Row`, `Button`,
`Field`, `Tabs`, `VerdictBadge`/`RoleBadge`/`StatusBadge`, `HoldingCard`,
`CashSummaryCard`, `PipelineFlow`, `CommitteeRolesPanel`. A few need context: wrap in
`ToastProvider` for toast flows; supply your own `SWRConfig` + backend for the data-bound
ones (`DashboardHero`, `SymbolSearch`, `PnLChart`, `OutperformShareCard`, and the dialogs).

## 2. Style with the token variables, NOT invented utility classes
The shipped `styles.css` is a **fixed compiled Tailwind set** — only the classes invest-gui
itself already uses are present, so a new class name like `bg-surface-raised` will NOT
resolve. Style your own layout/color glue with the CSS-variable tokens (always defined in
`:root`), via inline `style` or your own CSS. The components carry their own styling.

Token vocabulary (all `var(--*)`):
- **Surfaces** — `--surface-base` (page), `--surface-raised` (cards/dialogs),
  `--surface-overlay` (hover/nested), `--surface-inverse` (light/marketing).
- **Borders** — `--border-subtle` (dividers), `--border-strong` (card edges/focus).
- **Text** — `--text-primary`, `--text-secondary`, `--text-tertiary`, `--text-inverse`.
- **Accent** — `--accent`, `--accent-hover`, `--accent-foreground` (mono, near-white).
- **Data semantics (numbers/status ONLY, never decoration)** — `--pos` / `--pos-bg`
  (up/profit, green), `--neg` / `--neg-bg` (down/loss, red), `--warn` / `--warn-bg`
  (caution, amber), `--stale` (stale data, grey).
- **Fonts** — `--font-display` (Playfair Display serif, hero numbers), `--font-ui` (Inter,
  body), `--font-mono` (JetBrains Mono, all figures).

Two custom classes ARE shipped and safe to use: `chip-pos` / `chip-neg` / `chip-warn`
(status pills: token bg + token text). Numbers use `var(--font-mono)` + `tabular-nums`.

## House idioms
- **Zero border-radius, 1px solid borders** — a deliberate "financial instrument, not soft"
  look. Don't round corners.
- **Color carries meaning** — only ever color a value with `--pos`/`--neg`/`--warn` to mean
  up/down/caution. Never use them as decoration. Plain labels stay `--text-tertiary`.
- **Right-align + mono all figures.** Labels left in `--text-tertiary`, values right in
  `--text-primary` `font-mono`.

## Where the truth lives
- Tokens + the shipped class set: `styles.css` → `_ds_bundle.css` (read these before styling).
- Per-component API + usage: each component's `<Name>.d.ts` (`<Name>Props`) and
  `<Name>.prompt.md`.

## One idiomatic snippet
```jsx
import { Card, Row, Button, VerdictBadge } from "<this design system>";

<div style={{ background: "var(--surface-base)", padding: 24 }}>
  <Card title="NDQ.AX" subtitle="BetaShares Nasdaq 100 ETF"
        actions={<Button size="sm" variant="ghost">Refresh</Button>}>
    <Row label="Market value" value="A$4,812.00" />
    <Row label="Unrealised P&L"
         value={<span style={{ color: "var(--pos)" }}>+A$960.00</span>} />
    <Row label="Verdict" value={<VerdictBadge verdict="BUY" />} />
  </Card>
</div>
```
