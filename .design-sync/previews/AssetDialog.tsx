import { AssetDialog } from "invest-gui";

// 编辑模式 —— 预填一个 target_asset（含删除按钮）。
export const Edit = () => (
  <AssetDialog
    mode="edit"
    open
    onClose={() => {}}
    asset={{
      symbol: "NDQ.AX",
      display_name: "BetaShares Nasdaq 100 ETF",
      channel: "CommSec",
      max_single_invest_cny: 8000,
      price_offset_pct: 0.005,
      sell_fee_pct: 0.0038,
    }}
  />
);

// 新增模式 —— 空白表单，symbol 可输入。
export const Create = () => (
  <AssetDialog mode="create" open onClose={() => {}} />
);
