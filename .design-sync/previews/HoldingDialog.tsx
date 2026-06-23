import { HoldingDialog } from "invest-gui";

// 编辑模式 —— 预填一个实仓（symbol 锁定，含删除按钮）。
export const Edit = () => (
  <HoldingDialog
    mode="edit"
    open
    onClose={() => {}}
    holding={{
      symbol: "AAPL",
      kind: "equity",
      units: 25,
      unit_label: "股",
      avg_cost: 178.4,
      cost_currency: "USD",
      channel: "Moomoo",
      display_name: "Apple Inc.",
      proxy_kind: "direct",
      is_tracking_only: false,
    }}
  />
);

// 新增模式 —— 含 SymbolSearch（搜索建议数据需后端，预览只渲染空壳）。
export const Create = () => (
  <HoldingDialog mode="create" open onClose={() => {}} />
);
