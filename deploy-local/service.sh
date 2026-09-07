#!/bin/bash
# Run the PilotDeck board as a login-time macOS service (user LaunchAgent).
#
#   bash deploy-local/service.sh install     # generate the plist + load it
#   bash deploy-local/service.sh uninstall   # unload + remove it
#   bash deploy-local/service.sh status
#
# `install` needs AUTH_SECRET in the environment (the same stable value the
# board signs sessions with). Postgres must already be running:
#   brew services start postgresql@16
set -euo pipefail

LABEL="dev.pilotdeck.board"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
NODE="$(command -v node)"
NEXT="$REPO/apps/web/node_modules/.bin/next"
LOG="$HOME/Library/Logs/pilotdeck-board.log"
DB="${DATABASE_URL:-postgres://pilotdeck:pilotdeck@localhost:5432/pilotdeck}"

case "${1:-}" in
  install)
    : "${AUTH_SECRET:?export AUTH_SECRET first (the stable session-signing key)}"
    [ -x "$NEXT" ] || { echo "build the app first:  cd '$REPO' && pnpm install && pnpm --filter @pilotdeck/web build"; exit 1; }
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
    # free :3000 first — a stray `next start` from a shell would keep the
    # service crash-looping on a bind it can never win.
    lsof -ti tcp:3000 2>/dev/null | xargs -r kill 2>/dev/null || true
    sleep 1
    launchctl unload "$PLIST" 2>/dev/null || true
    launchctl load "$PLIST"
    sleep 5
    curl -fsS -o /dev/null "http://127.0.0.1:3000/home" \
      && echo "up: http://127.0.0.1:3000  (logs: $LOG)" \
      || { echo "did not come up — check $LOG"; exit 1; }
    ;;
  uninstall)
    launchctl unload "$PLIST" 2>/dev/null || true
    rm -f "$PLIST"
    echo "removed $PLIST"
    ;;
  status)
    launchctl list | grep "$LABEL" || echo "not loaded"
    curl -fsS -o /dev/null -w "http %{http_code}\n" "http://127.0.0.1:3000/home" || true
    ;;
  *)
    echo "usage: bash deploy-local/service.sh {install|uninstall|status}"; exit 2 ;;
esac
