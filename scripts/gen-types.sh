#!/usr/bin/env bash
# 从本机 invest 后端拉 OpenAPI schema，生成 TS 类型
# 前提：invest 后端在 127.0.0.1:8765 上运行（uv run uvicorn connectors.web_api:app）
set -e

API_URL="${INVEST_API_URL:-http://127.0.0.1:8765/openapi.json}"

cd "$(dirname "$0")/.."

echo "→ 拉 OpenAPI schema: $API_URL"
if ! curl -sSf "$API_URL" -o /dev/null; then
  echo "❌ $API_URL 不可达，请先在 invest/ 下启动后端："
  echo "   uv run uvicorn connectors.web_api:app --host 127.0.0.1 --port 8765"
  exit 1
fi

pnpm dlx openapi-typescript "$API_URL" -o src/lib/api-types.ts
echo "✅ 已写入 src/lib/api-types.ts"
