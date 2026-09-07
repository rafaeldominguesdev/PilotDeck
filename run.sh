#!/bin/bash
# Start the PilotDeck board locally (Postgres via brew + the Next app on :3000).
# Usage: bash run.sh          (build if needed, then serve)
#        bash run.sh --dev    (next dev, hot reload)
set -euo pipefail
cd "$(dirname "$0")"

export DATABASE_URL="${DATABASE_URL:-postgres://pilotdeck:pilotdeck@localhost:5432/pilotdeck}"
export NEXT_TELEMETRY_DISABLED=1
# A board you started on your own machine, for yourself, does not ask you to
# log in: with a single user and a request that came over loopback, the login
# is friction with nothing behind it. It still applies to nobody else — a
# browser reaching this port from another machine gets the login screen as
# usual. Set PILOTDECK_NO_LOGIN=0 to keep it on here too.
export PILOTDECK_NO_LOGIN="${PILOTDECK_NO_LOGIN:-1}"
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
