import type { DeployMode } from "./deploy-mode";

/**
 * The commands the UI offers, in their own module because both the server
 * pages and the client components show them, and everything else in
 * `updates.ts` reads the filesystem: importing that from a client component
 * drags `node:fs` into the browser bundle.
 *
 * Every command here is mode-aware (OCL-73). The root quickstart compose file
 * and the hosted `deploy/` compose file are two different projects on two
 * different `docker compose` invocations; the quickstart command run against
 * a hosted instance is the exact one that caused the OCL-43 incident. Picking
 * the command from the deploy mode the instance actually reports, instead of
 * a single command shown everywhere, is what keeps that from happening again.
 */

/**
 * The one command that turns the updater on. It is a compose profile, so
 * enabling it is opt-in and the tradeoff stays explicit: that container gets
 * the docker socket, which is root on the host.
 */
export function updaterEnableCommand(mode: DeployMode): string {
  return mode === "hosted"
    ? "docker compose -p pilotdeck -f deploy/docker-compose.cloud.yml --profile updater up -d"
    : "docker compose --profile updater up -d";
}

/**
 * What to run by hand when nobody wants a sidecar holding the socket. A
 * hosted instance only ever gets there through `./deploy/deploy.sh`: it holds
 * the deploy lock, pins the compose project and files, and guards against the
 * legacy-orphan collision OCL-43 fixed. The quickstart command matches the
 * documented install, a git checkout that builds its own image with the root
 * compose file.
 */
export function updateCommand(mode: DeployMode): string {
  return mode === "hosted" ? "./deploy/deploy.sh" : "git pull && docker compose up -d --build";
}

/**
 * What updates an instance started from the checkout itself, `next dev` or a
 * built node process on the host. No container exists to pull or recreate, so
 * the code is refreshed in place and the process is restarted by whoever
 * started it. Mode-independent: a source checkout has no compose project.
 */
export const SOURCE_UPDATE_COMMAND =
  "git pull && pnpm install && pnpm --filter @pilotdeck/mcp-core build";
