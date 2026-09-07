#!/bin/bash
# Run the PilotDeck board locally.
#
#   bash deploy-local/service.sh start        # start it now, in the background
#   bash deploy-local/service.sh stop         # stop it
#   bash deploy-local/service.sh restart
#   bash deploy-local/service.sh status
#
#   bash deploy-local/service.sh install      # OR: run at every login (LaunchAgent)
#   bash deploy-local/service.sh uninstall
#
# Needs AUTH_SECRET in the environment (the stable session-signing key) and
# Postgres already running:  brew services start postgresql@16
#
# For "up only while I work" (not at boot), put `service.sh start` in whatever
# you run when you sit down — a DevTerm project hook, a shell alias, by hand.
set -euo pipefail

LABEL="dev.pilotdeck.board"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
NODE="$(command -v node)"
NEXT="$REPO/apps/web/node_modules/.bin/next"
LOG="$HOME/Library/Logs/pilotdeck-board.log"
PIDFILE="$HOME/Library/Caches/pilotdeck-board.pid"
DB="${DATABASE_URL:-postgres://pilotdeck:pilotdeck@localhost:5432/pilotdeck}"

running_pid() { lsof -ti tcp:3000 2>/dev/null | head -1; }

do_stop() {
  local pid; pid="$(running_pid || true)"
  [ -n "$pid" ] && kill "$pid" 2>/dev/null || true
  [ -f "$PIDFILE" ] && rm -f "$PIDFILE"
  sleep 1
}

do_start() {
  : "${AUTH_SECRET:?export AUTH_SECRET first (the stable session-signing key)}"
  [ -x "$NEXT" ] || { echo "build first:  cd '$REPO' && pnpm install && pnpm --filter @pilotdeck/web build"; exit 1; }
  if [ -n "$(running_pid || true)" ]; then echo "already up: http://127.0.0.1:3000"; return; fi
  mkdir -p "$(dirname "$LOG")" "$(dirname "$PIDFILE")"
  ( cd "$REPO/apps/web" && \
    DATABASE_URL="$DB" AUTH_SECRET="$AUTH_SECRET" NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 \
    nohup "$NODE" "$NEXT" start --hostname 127.0.0.1 --port 3000 >>"$LOG" 2>&1 & echo $! >"$PIDFILE" )
  for _ in $(seq 1 20); do
    curl -fsS -o /dev/null "http://127.0.0.1:3000/home" 2>/dev/null && { echo "up: http://127.0.0.1:3000  (logs: $LOG)"; return; }
    sleep 1
  done
  echo "did not come up — check $LOG"; exit 1
}

case "${1:-}" in
  start)   do_start ;;
  stop)    do_stop; echo "stopped" ;;
  restart) do_stop; do_start ;;
  status)
    if launchctl list 2>/dev/null | grep -q "$LABEL"; then echo "LaunchAgent: loaded"; else echo "LaunchAgent: not loaded"; fi
    curl -fsS -o /dev/null -w "http %{http_code}\n" "http://127.0.0.1:3000/home" 2>/dev/null || echo "board: down"
    ;;
  install)
    : "${AUTH_SECRET:?export AUTH_SECRET first (the stable session-signing key)}"
    [ -x "$NEXT" ] || { echo "build first:  cd '$REPO' && pnpm install && pnpm --filter @pilotdeck/web build"; exit 1; }
    mkdir -p "$(dirname "$PLIST")" "$(dirname "$LOG")"
    cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>WorkingDirectory</key><string>$REPO/apps/web</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE</string><string>$NEXT</string><string>start</string>
    <string>--hostname</string><string>127.0.0.1</string>
    <string>--port</string><string>3000</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>DATABASE_URL</key><string>$DB</string>
    <key>AUTH_SECRET</key><string>$AUTH_SECRET</string>
    <key>NODE_ENV</key><string>production</string>
    <key>NEXT_TELEMETRY_DISABLED</key><string>1</string>
    <key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict>
</plist>
EOF
    chmod 600 "$PLIST"
    lsof -ti tcp:3000 2>/dev/null | xargs -r kill 2>/dev/null || true
    sleep 1
    launchctl unload "$PLIST" 2>/dev/null || true
    launchctl load "$PLIST"
    sleep 5
    curl -fsS -o /dev/null "http://127.0.0.1:3000/home" \
      && echo "up at every login: http://127.0.0.1:3000  (logs: $LOG)" \
      || { echo "did not come up — check $LOG"; exit 1; }
    ;;
  uninstall)
    launchctl unload "$PLIST" 2>/dev/null || true
    rm -f "$PLIST"
    echo "removed $PLIST — the board no longer starts at login (use 'start' by hand)"
    ;;
  *)
    echo "usage: bash deploy-local/service.sh {start|stop|restart|status|install|uninstall}"; exit 2 ;;
esac
