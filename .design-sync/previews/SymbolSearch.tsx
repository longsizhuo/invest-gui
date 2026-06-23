import { SymbolSearch } from "invest-gui";

// Data-bound: the dropdown is populated by a debounced fetch to
// /api/symbols/search, which has no backend in previews. The closed-input
// state renders fully without a fetch — author that. `value` < 2 chars never
// triggers the request, so the input shows statically.
export const Empty = () => (
  <div style={{ width: 380 }}>
    <SymbolSearch value="" onChange={() => {}} onSelect={() => {}} />
  </div>
);

export const WithValue = () => (
  <div style={{ width: 380 }}>
    <SymbolSearch value="NDQ.AX" onChange={() => {}} onSelect={() => {}} />
  </div>
);
