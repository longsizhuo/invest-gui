# src/components/

可复用 UI 组件。**不含路由级页面**（那些在 `routes/`）；这里都是被多页面复用的 building block。

## 内容

| 组件 | 用在哪 |
|------|------|
| `Button.tsx` | 通用按钮（primary / danger / ghost 三个 variant） |
| `Field.tsx` | 表单字段壳（label + input/select 容器 + hint）|
| `Card.tsx` | 持仓/策略卡（含 `Row` 子组件做 label-value 行） |
| `Dialog.tsx` | 原生 `<dialog>` 包装（焦点管理 + ESC + backdrop click） |
| `CashDialog.tsx` | 存款/取款 dialog（mode: deposit / withdraw） |
| `GoldTradeDialog.tsx` | 黄金买卖 dialog（mode: buy / sell） |
| `GoldOffsetDialog.tsx` | 报浙商克价反推点差 |
| `AllocationsDialog.tsx` | 改 stock/cash 目标比例（schema 强约束 ≈ 1.0） |
| `AssetDialog.tsx` | strategy 资产 CRUD（create / edit / delete） |
| `PnLChart.tsx` | 嵌入 `/api/pnl_chart.svg`（后端自家 SVG） |
| `TradingViewChart.tsx` | TradingView Advanced Chart widget 嵌入 |

## 设计约束

- 所有 dialog 提交成功后调 `mutate(...)` 让 SWR 立刻重拉
- 错误处理：`ApiError` 实例 → 展示 `err.detail`；其他 → `String(err)`
- 表单输入限制：在前端做"宽容前置校验"（金额>0），后端 schema 兜底"严格强约束"
