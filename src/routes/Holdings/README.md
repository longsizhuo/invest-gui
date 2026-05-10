# Holdings 路由

持仓相关子路由。

## 文件

| 文件 | 职责 |
|------|------|
| `BulkImport.tsx` | 批量录入历史交易，支持 CSV 粘贴 + 逐行手动两种模式 |

## 路由挂载

- `/holdings/import` → BulkImport
- 入口：Dashboard 持仓区块底部"批量导入"按钮
