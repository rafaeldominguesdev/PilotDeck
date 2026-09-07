import { user } from "@pilotdeck/db/schema";
import { eq } from "drizzle-orm";
import { detectDeployMode } from "./deploy-mode";
import { db } from "./db";
import type { SessionPayload } from "./session";

/**
 * Open instance: no login screen, and no pairing code either.
 *
 * A board somebody started on their own machine, for themselves, asks who
 * they are on every page load and asks an agent for six digits before it can
 * read a card — and on that machine both answers were never in doubt. This
 * turns the two off together, because turning off only one of them leaves the
 * friction and keeps none of the protection.
 *
 * What it costs is not subtle, and is the whole reason it is a switch and not
 * the default: `next start` listens on 0.0.0.0, so with this on, **anyone who
 * can reach the port is signed in as the owner** — same wifi, same office,
 * same tunnel. The board still refuses it in the one place where that is
 * somebody else's data: a hosted deployment ignores this flag entirely.
 *
 * A board with people in it should never have this on.
 */
export const OPEN_ENV = "PILOTDECK_OPEN";

/** Whether this instance was told to skip login and pairing. */
export function isOpenInstance(): boolean {
  if (process.env[OPEN_ENV]?.trim() !== "1") return false;
  // The hosted deployment holds other people's boards; the switch stops here.
  return detectDeployMode() !== "hosted";
}

/**
 * The owner of an open instance: the first active user. Null when the board
 * has no user yet — that still goes through /setup, which is where the first
 * account and the workspace come from, and it happens exactly once.
 */
export async function localSession(): Promise<SessionPayload | null> {
  if (!isOpenInstance()) return null;

  const rows = await db()
    .select({
      id: user.id,
      email: user.email,
      active: user.active,
      sessionVersion: user.sessionVersion,
    })
    .from(user)
    .where(eq(user.active, true))
    .limit(1);

  const owner = rows[0];
  if (!owner) return null;

  return {
    userId: owner.id,
    email: owner.email,
    sessionVersion: owner.sessionVersion,
  };
}
