# scripts/

构建/部署/类型同步辅助脚本。**不在 CI 里跑**（避免后端没起阻塞构建）；都是开发者本地 / 服务器手动执行。

## 内容

- `gen-types.sh` — 从本机 `127.0.0.1:8765/openapi.json` 拉 OpenAPI schema → 用 `openapi-typescript` 生成 `src/lib/api-types.ts`。后端改了端点跑这个一行同步。
- `deploy.sh` — `pnpm build` + `sudo rsync dist/ /srv/invest-gui/`。Caddy file_server 直接 serve，无需 reload。

## 使用

```bash
pnpm gen-types   # = bash scripts/gen-types.sh
pnpm deploy      # = bash scripts/deploy.sh（需 sudo）
```

## 与其他目录的关系

- 上游：`package.json` 里 npm scripts 转发到这两个 sh
- 下游：`gen-types.sh` 写入 `src/lib/api-types.ts`；`deploy.sh` 写入 `/srv/invest-gui/`（生产部署目录）
