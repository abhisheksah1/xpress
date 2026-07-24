#!/usr/bin/env bash
# Deploy / refresh KoseliXpress on a VPS after git pull.
# Usage (from repo root):
#   bash deploy.sh
#   bash deploy.sh --skip-pull
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

SKIP_PULL=0
for arg in "$@"; do
  case "$arg" in
    --skip-pull) SKIP_PULL=1 ;;
  esac
done

if [[ "$SKIP_PULL" -eq 0 ]]; then
  echo "==> git pull"
  git pull --ff-only
fi

echo "==> backend deps"
cd "$ROOT/backend"
npm install --omit=dev

echo "==> frontend deps + production build"
cd "$ROOT/frontend"
npm install
npm run build

echo "==> restart API (PM2 if present, else systemd hint)"
cd "$ROOT"
restart_pm2() {
  local name="$1"
  if pm2 describe "$name" >/dev/null 2>&1; then
    echo "Restarting PM2 app: $name"
    pm2 restart "$name" --update-env
    return 0
  fi
  return 1
}

if command -v pm2 >/dev/null 2>&1; then
  # Match common production process names (logs show koseli-api)
  if restart_pm2 koseli-api \
    || restart_pm2 koselixpress \
    || restart_pm2 xpress \
    || restart_pm2 backend \
    || restart_pm2 koseli; then
    pm2 save || true
    pm2 status
  else
    echo "PM2 is installed but no known app name found."
    echo "Restart manually, e.g.: pm2 restart koseli-api --update-env"
    pm2 list
    exit 1
  fi
else
  echo "PM2 not found. Restart your Node process so FRONTEND_DIST is still served."
  echo "Example: systemctl restart koselixpress"
fi

echo ""
echo "Done. New Vite build is in frontend/dist."
echo "Hard-refresh the browser once (Ctrl+Shift+R) if you still see an old page."
echo "Ensure backend/.env has: FRONTEND_DIST=../frontend/dist"
echo "Health check: curl -sI http://127.0.0.1:\${PORT:-5001}/api/v1/store/settings"
