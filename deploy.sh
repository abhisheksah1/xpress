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
if command -v pm2 >/dev/null 2>&1; then
  # Prefer ecosystem name; fall back to common process names
  if pm2 describe koselixpress >/dev/null 2>&1; then
    pm2 restart koselixpress --update-env
  elif pm2 describe xpress >/dev/null 2>&1; then
    pm2 restart xpress --update-env
  elif pm2 describe backend >/dev/null 2>&1; then
    pm2 restart backend --update-env
  else
    echo "PM2 is installed but no known app name found."
    echo "Restart manually, e.g.: pm2 restart <app-name> --update-env"
    pm2 list
  fi
  pm2 save || true
else
  echo "PM2 not found. Restart your Node process so FRONTEND_DIST is still served."
  echo "Example: systemctl restart koselixpress"
fi

echo ""
echo "Done. New Vite build is in frontend/dist."
echo "Hard-refresh the browser once (Ctrl+Shift+R) if you still see an old page."
echo "Ensure backend/.env has: FRONTEND_DIST=../frontend/dist"
