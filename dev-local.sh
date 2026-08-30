#!/usr/bin/env bash
# Diže LOKALNI billing stack jednom komandom:
#   • PHP backend (api/) na 127.0.0.1:8787  -> gađa lokalnu bazu infinityplay_local
#   • Vite frontend sa proxy-jem na taj PHP (a NE na produkciju)
#
# Pokreni:  ./dev-local.sh   (ili: npm run dev:full)
# Prekini:  Ctrl+C  (gasi i PHP i Vite)
set -euo pipefail
cd "$(dirname "$0")"

command -v php >/dev/null || { echo "❌ PHP nije instaliran/na PATH-u."; exit 1; }

echo "▶ Pokrećem PHP backend na http://127.0.0.1:8787 (api/) …"
php -S 127.0.0.1:8787 -t api >/tmp/infinityplay-php.log 2>&1 &
PHP_PID=$!

# Ugasi PHP kad se skripta prekine.
cleanup() { echo; echo "⏹  Gasim PHP backend…"; kill "$PHP_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

sleep 1
if ! curl -s -o /dev/null http://127.0.0.1:8787/health.php; then
  echo "❌ PHP backend se nije podigao. Log: /tmp/infinityplay-php.log"; exit 1
fi
echo "✅ PHP backend radi."
echo "▶ Pokrećem frontend (Vite) sa proxy-jem na lokalni backend …"
echo "   Otvori http://localhost:5173  |  login: demo@firma.rs / demo1234"
echo

VITE_PROXY_TARGET=http://127.0.0.1:8787 exec npx vite
