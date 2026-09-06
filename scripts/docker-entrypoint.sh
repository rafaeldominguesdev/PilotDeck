#!/bin/sh
set -eu

pnpm --filter @pilotdeck/db migrate
pnpm --filter @pilotdeck/db seed
exec pnpm --filter @pilotdeck/web start
