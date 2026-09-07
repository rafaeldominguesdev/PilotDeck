#!/bin/bash
# Run the PilotDeck board locally.
#
#   bash deploy-local/service.sh start          # start now, background
#   bash deploy-local/service.sh stop
#   bash deploy-local/service.sh restart
#   bash deploy-local/service.sh status
#
#   bash deploy-local/service.sh watch-devterm  # board follows DevTerm:
#                                               #   DevTerm open  -> board up
#                                               #   DevTerm quit  -> board down
#                                               #   nothing runs at boot except a 20s check
#   bash deploy-local/service.sh install        # board at every login (always on)
#   bash deploy-local/service.sh uninstall      # remove both agents
#
# Needs AUTH_SECRET in the environment (the stable session-signing key) and
# Postgres running:  brew services start postgresql@16
set -euo pipefail

LABEL="dev.pilotdeck.board"
WATCH_LABEL="dev.pilotdeck.watch"
LA="$HOME/Library/LaunchAgents"
PLIST="$LA/$LABEL.plist"
WATCH_PLIST="$LA/$WATCH_LABEL.plist"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
SELF="$REPO/deploy-local/service.sh"
NODE="$(command -v node)"
NEXT="$REPO/apps/web/node_modules/.bin/next"
LOG="$HOME/Library/Logs/pilotdeck-board.log"
PIDFILE="$HOME/Library/Caches/pilotdeck-board.pid"
DB="${DATABASE_URL:-postgres://pilotdeck:pilotdeck@localhost:5432/pilotdeck}"

board_up()   { curl -fsS -o /dev/null "http://127.0.0.1:3000/home" 2>/dev/null; }
board_pid()  { lsof -ti tcp:3000 2>/dev/null | head -1; }
devterm_up() { pgrep -qi "DevTerm" 2>/dev/null; }

need_build() { [ -x "$NEXT" ] || { echo "build first:  cd '$REPO' && pnpm install && pnpm --filter @pilotdeck/web build"; exit 1; }; }

do_stop() {
  local pid; pid="$(board_pid || true)"
  [ -n "$pid" ] && kill "$pid" 2>/dev/null || true
  rm -f "$PIDFILE"
  sleep 1
}

do_start() {
  : "${AUTH_SECRET:?export AUTH_SECRET first (the stable session-signing key)}"
  need_build
  board_up && { echo "already up: http://127.0.0.1:3000"; return; }
  mkdir -p "$(dirname "$LOG")" "$(dirname "$PIDFILE")"
  ( cd "$REPO/apps/web" && \
    DATABASE_URL="$DB" AUTH_SECRET="$AUTH_SECRET" NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 \
    nohup "$NODE" "$NEXT" start --hostname 127.0.0.1 --port 3000 >>"$LOG" 2>&1 & echo $! >"$PIDFILE" )
  for _ in $(seq 1 20); do board_up && { echo "up: http://127.0.0.1:3000  (logs: $LOG)"; return; }; sleep 1; done
  echo "did not come up — check $LOG"; exit 1
}

# Called by the watch LaunchAgent every 20s. AUTH_SECRET comes from its env.
do_tick() {
  if devterm_up; then
    board_up || do_start >/dev/null 2>&1 || true
  else
    [ -n "$(board_pid || true)" ] && do_stop || true
  fi
}

write_board_plist() {
  : "${AUTH_SECRET:?export AUTH_SECRET first}"
  need_build
  mkdir -p "$LA" "$(dirname "$LOG")"
  cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$LABEL</string>
  <key>WorkingDirectory</key><string>$REPO/apps/web</string>
  <key>ProgramArguments</key><array>
    <string>$NODE</string><string>$NEXT</string><string>start</string>
    <string>--hostname</string><string>127.0.0.1</string><string>--port</string><string>3000</string>
  </array>
  <key>EnvironmentVariables</key><dict>
    <key>DATABASE_URL</key><string>$DB</string>
    <key>AUTH_SECRET</key><string>$AUTH_SECRET</string>
    <key>NODE_ENV</key><string>production</string>
    <key>NEXT_TELEMETRY_DISABLED</key><string>1</string>
    <key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
  </dict>
  <key>KeepAlive</key><true/>
  <key>RunAtLoad</key><$1/>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict></plist>
EOF
  chmod 600 "$PLIST"
}

case "${1:-}" in
  start)   do_start ;;
  stop)    do_stop; echo "stopped" ;;
  restart) do_stop; do_start ;;
  _tick)   do_tick ;;
  status)
    launchctl list 2>/dev/null | grep -q "$WATCH_LABEL" && echo "watch-devterm: on" || echo "watch-devterm: off"
    launchctl list 2>/dev/null | grep -q "$LABEL"       && echo "login service: on" || echo "login service: off"
    board_up && echo "board: up (http://127.0.0.1:3000)" || echo "board: down"
    devterm_up && echo "DevTerm: running" || echo "DevTerm: not running"
    ;;
  watch-devterm)
    : "${AUTH_SECRET:?export AUTH_SECRET first (the stable session-signing key)}"
    write_board_plist false
    launchctl unload "$PLIST" 2>/dev/null || true
    launchctl load "$PLIST"          # loaded, KeepAlive on, but RunAtLoad off — idle until started
    cat > "$WATCH_PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$WATCH_LABEL</string>
  <key>ProgramArguments</key><array><string>/bin/bash</string><string>$SELF</string><string>_tick</string></array>
  <key>EnvironmentVariables</key><dict>
    <key>DATABASE_URL</key><string>$DB</string>
    <key>AUTH_SECRET</key><string>$AUTH_SECRET</string>
    <key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>StartInterval</key><integer>20</integer>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict></plist>
EOF
    chmod 600 "$WATCH_PLIST"
    launchctl unload "$WATCH_PLIST" 2>/dev/null || true
    launchctl load "$WATCH_PLIST"
    echo "watching DevTerm. open it -> board comes up within ~20s; quit it -> board goes down."
    echo "off:  bash deploy-local/service.sh uninstall"
    ;;
  install)
    write_board_plist true
    lsof -ti tcp:3000 2>/dev/null | xargs -r kill 2>/dev/null || true
    sleep 1
    launchctl unload "$PLIST" 2>/dev/null || true
    launchctl load "$PLIST"
    sleep 5
    board_up && echo "up at every login: http://127.0.0.1:3000  (logs: $LOG)" || { echo "check $LOG"; exit 1; }
    ;;
  uninstall)
    launchctl unload "$WATCH_PLIST" 2>/dev/null || true
    launchctl unload "$PLIST" 2>/dev/null || true
    rm -f "$WATCH_PLIST" "$PLIST"
    do_stop
    echo "removed both agents. start by hand with:  bash deploy-local/service.sh start"
    ;;
  *)
    echo "usage: bash deploy-local/service.sh {start|stop|restart|status|watch-devterm|install|uninstall}"; exit 2 ;;
esac
