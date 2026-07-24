#!/usr/bin/env bash
# Emergency fix for 502 on koselixpress.com.np
# Run on the VPS from the repo root:
#   bash scripts/vps-fix-502.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/backend/.env"

echo "==> Repo: $ROOT"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: missing $ENV_FILE"
  exit 1
fi

# Backup
cp -a "$ENV_FILE" "$ENV_FILE.bak.$(date +%Y%m%d%H%M%S)"
echo "==> Backed up .env"

# 1) Stop crash: default super-admin password
if grep -qE '^SUPER_ADMIN_PASSWORD=ChangeMe@123[[:space:]]*$' "$ENV_FILE"; then
  NEW_PASS="Kx$(openssl rand -hex 8)!"
  sed -i "s/^SUPER_ADMIN_PASSWORD=ChangeMe@123[[:space:]]*$/SUPER_ADMIN_PASSWORD=${NEW_PASS}/" "$ENV_FILE"
  echo "==> Replaced SUPER_ADMIN_PASSWORD=ChangeMe@123 with a strong random password"
  echo "    (saved in backend/.env — copy it somewhere safe)"
else
  echo "==> SUPER_ADMIN_PASSWORD already customized (ok)"
fi

# 2) Force production mode
if grep -qE '^NODE_ENV=' "$ENV_FILE"; then
  sed -i 's/^NODE_ENV=.*/NODE_ENV=production/' "$ENV_FILE"
else
  echo 'NODE_ENV=production' >> "$ENV_FILE"
fi
echo "==> NODE_ENV=production"

# 3) CORS must include www (origins only, no /admin paths)
if grep -qE '^CORS_ORIGINS=' "$ENV_FILE"; then
  sed -i 's|^CORS_ORIGINS=.*|CORS_ORIGINS=https://koselixpress.com.np,https://www.koselixpress.com.np|' "$ENV_FILE"
else
  echo 'CORS_ORIGINS=https://koselixpress.com.np,https://www.koselixpress.com.np' >> "$ENV_FILE"
fi
echo "==> CORS_ORIGINS includes apex + www"

# 4) NPS env must be exactly "production" (not "live")
if grep -qE '^NPS_ENVIRONMENT=' "$ENV_FILE"; then
  sed -i 's/^NPS_ENVIRONMENT=.*/NPS_ENVIRONMENT=production/' "$ENV_FILE"
  echo "==> NPS_ENVIRONMENT=production"
fi

# 5) FRONTEND_DIST for SPA serving
if ! grep -qE '^FRONTEND_DIST=' "$ENV_FILE"; then
  echo 'FRONTEND_DIST=../frontend/dist' >> "$ENV_FILE"
  echo "==> Added FRONTEND_DIST=../frontend/dist"
fi

# 6) Pull latest + install + build + restart
cd "$ROOT"
echo "==> git pull"
git pull --ff-only || true

echo "==> backend deps"
cd "$ROOT/backend"
npm install --omit=dev

echo "==> frontend build"
cd "$ROOT/frontend"
npm install
npm run build

cd "$ROOT"
PORT="$(grep -E '^PORT=' "$ENV_FILE" | head -1 | cut -d= -f2 | tr -d '[:space:]')"
PORT="${PORT:-5001}"

if command -v pm2 >/dev/null 2>&1; then
  APP=""
  for name in koseli-api koselixpress xpress backend koseli; do
    if pm2 describe "$name" >/dev/null 2>&1; then
      APP="$name"
      break
    fi
  done
  if [[ -z "$APP" ]]; then
    echo "ERROR: no PM2 app found. Start with:"
    echo "  cd $ROOT/backend && pm2 start server.js --name koseli-api"
    pm2 list
    exit 1
  fi
  echo "==> pm2 restart $APP --update-env"
  pm2 restart "$APP" --update-env
  pm2 save || true
  sleep 2
  pm2 status
  echo "==> recent logs"
  pm2 logs "$APP" --lines 40 --nostream || true
else
  echo "ERROR: pm2 not found"
  exit 1
fi

echo ""
echo "==> local health check (port $PORT)"
if curl -sS -o /dev/null -w "HTTP %{http_code}\n" "http://127.0.0.1:${PORT}/api/v1/store/settings"; then
  :
else
  echo "Local curl failed — API still down. Check: pm2 logs"
  exit 1
fi

echo ""
echo "Done. Hard-refresh https://koselixpress.com.np/admin (Ctrl+Shift+R)."
echo "If still 502, Nginx upstream port must match PORT=$PORT in backend/.env"
