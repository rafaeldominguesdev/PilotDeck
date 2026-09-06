/**
 * The step runner bound to this machine: real commands, this process's own
 * checkout, and the record of what happened written back to the workspace.
 *
 * It lives outside the actions file because two callers need it, and only one
 * of them is an action: the button asks for it, and the automatic mode's
 * scheduler runs it with nobody watching.
 */

import { execFile } from "node:child_process";
import { workspace, type AutoUpdateRecord } from "@pilotdeck/db";
import { eq } from "drizzle-orm";
import { db } from "./db";
import {
  RESTART_ENV,
  restartOptInFrom,
  runSourceUpdate,
  type Exec,
  type ProcessMode,
  type SourceUpdateReport,
} from "./source-update";

/** How long any single update step may run before it is given up on. */
const STEP_TIMEOUT_MS = 10 * 60_000;
/** Output a step may print before the rest is dropped. Only the tail is shown. */
const STEP_MAX_BUFFER = 4 * 1024 * 1024;
/** Grace for the response to reach the browser before the process ends. */
export const EXIT_DELAY_MS = 1500;

/**
 * Runs one command and reports how it went instead of throwing. A step that
 * fails is a result the panel shows, not an exception: the runner decides
 * whether the update can continue.
 */
export const shellExec: Exec = (command, args, cwd) =>
  new Promise((resolve) => {
    execFile(
      command,
      [...args],
      { cwd, timeout: STEP_TIMEOUT_MS, maxBuffer: STEP_MAX_BUFFER },
      (error, stdout, stderr) => {
        const code =
          error && typeof (error as { code?: unknown }).code === "number"
            ? ((error as { code: number }).code as number)
            : error
              ? 1
              : 0;
        resolve({
          code,
          stdout: stdout?.toString() ?? "",
          // A command that is not installed at all never prints anything, so
          // the spawn error is the only sentence explaining the failure.
          stderr: (stderr?.toString() ?? "") + (error && !stderr ? error.message : ""),
        });
      },
    );
  });

export function processMode(): ProcessMode {
  return process.env.NODE_ENV === "production" ? "production" : "dev";
}

/** Runs the update here, in this process's own repository. */
export function runHostSourceUpdate(force = false): Promise<SourceUpdateReport> {
  return runSourceUpdate({
    exec: shellExec,
    cwd: process.cwd(),
    mode: processMode(),
    restartOptIn: restartOptInFrom(process.env[RESTART_ENV]),
    force,
  });
}

/**
 * Ends the process so a supervisor starts it again, but only after the answer
 * had time to reach the browser: a panel that never sees its own step log is a
 * worse update than one that asks for a restart.
 */
export function scheduleExit(): void {
  setTimeout(() => process.exit(0), EXIT_DELAY_MS).unref();
}

/** Keeps the last run on the workspace, so the panel can say what and when. */
export async function recordUpdate(
  workspaceId: string,
  record: AutoUpdateRecord,
): Promise<void> {
  await db()
    .update(workspace)
    .set({ updateLog: record })
    .where(eq(workspace.id, workspaceId));
}
