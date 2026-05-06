#!/usr/bin/env bash
# 本机构建 → rsync 到 /srv/invest-gui/（Caddy file_server 直接 serve）
set -e

cd "$(dirname "$0")/.."

echo "→ pnpm install --frozen-lockfile"
pnpm install --frozen-lockfile

echo "→ pnpm build"
pnpm build

if [ ! -f dist/index.html ]; then
  echo "❌ dist/index.html 不存在，构建失败"
  exit 1
fi

DEST="${INVEST_GUI_DEST:-/srv/invest-gui}"
echo "→ rsync dist/ → $DEST"
sudo mkdir -p "$DEST"
sudo rsync -a --delete dist/ "$DEST/"

echo "✅ 已部署到 $DEST"
echo "   Caddy 直接 serve（caddy-gateway/Caddyfile 含 invest.longsizhuo.com 配置）"
echo "   无需 reload Caddy（仅静态文件变化）"
