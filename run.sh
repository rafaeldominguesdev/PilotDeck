#!/bin/bash
# Start the PilotDeck board locally (Postgres via brew + the Next app on :3000).
# Usage: bash run.sh          (build if needed, then serve)
#        bash run.sh --dev    (next dev, hot reload)
set -euo pipefail
cd "$(dirname "$0")"

# .env is what .env.example tells you to write, so read it here too — but only
# for what the shell did not already export, so `FOO=x bash run.sh` still wins.
if [ -f .env ]; then
  while IFS='=' read -r chave valor; do
    case "$chave" in ''|\#*) continue;; esac
    [ -n "${!chave:-}" ] || export "$chave=$valor"
  done < .env
fi

export DATABASE_URL="${DATABASE_URL:-postgres://pilotdeck:pilotdeck@localhost:5432/pilotdeck}"
export NEXT_TELEMETRY_DISABLED=1
# Open instance: no login screen and no 6-digit pairing code. This is a board
# for one person on their own machine, and both were ceremony there.
#
# It is not free: `next start` listens on 0.0.0.0, so while this is on, ANYONE
# who can reach this port is signed in as you — same wifi, same tunnel. Put
# people on this board, or expose it, and set PILOTDECK_OPEN=0.
export PILOTDECK_OPEN="${PILOTDECK_OPEN:-1}"
: "${AUTH_SECRET:?set AUTH_SECRET (a stable 32+ char string) before running}"

command -v pg_isready >/dev/null && pg_isready -q -h localhost -p 5432 \
  || { echo "Postgres not up on :5432 — run:  brew services start postgresql@16"; exit 1; }

pnpm install --frozen-lockfile
pnpm --filter @pilotdeck/mcp-core build
pnpm db:migrate

if [ "${1:-}" = "--dev" ]; then
  exec pnpm --filter @pilotdeck/web dev
fi

pnpm --filter @pilotdeck/web build
exec pnpm --filter @pilotdeck/web start
