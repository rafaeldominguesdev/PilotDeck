/**
 * Which compose project this container was started from. The update panel and
 * banner need it to pick the right instruction: the hosted project's own
 * compose file lives under `deploy/` and is only ever meant to be driven
 * through `./deploy/deploy.sh`, never the root quickstart file's raw
 * `docker compose` invocation (OCL-73 — that raw command is the one that
 * collided with the hosted project and took the board down in OCL-43).
 */
export type DeployMode = "hosted" | "quickstart";

/**
 * Set on the `app` service by each compose file: `hosted` in
 * deploy/docker-compose.cloud.yml, `quickstart` in the root one. A checkout
 * running outside either compose file (plain `next dev`, a bare `node`
 * process) has no reason to show container commands at all — the runtime
 * check in `runtime.ts` already routes those to the source-update path — so
 * defaulting the unset case to quickstart, the friendlier and more common
 * self-host path, is safe: it is never shown to a hosted instance, because a
 * hosted instance always sets this variable.
 */
export const DEPLOY_MODE_ENV = "PILOTDECK_DEPLOY_MODE";

export function detectDeployModeFrom(value: string | null | undefined): DeployMode {
  return value?.trim().toLowerCase() === "hosted" ? "hosted" : "quickstart";
}

/** How this instance was deployed, read from the machine it runs on. */
export function detectDeployMode(): DeployMode {
  return detectDeployModeFrom(process.env[DEPLOY_MODE_ENV]);
}
