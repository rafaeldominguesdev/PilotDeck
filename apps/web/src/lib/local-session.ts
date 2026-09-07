import { user } from "@pilotdeck/db/schema";
import { eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { detectDeployMode } from "./deploy-mode";
import { db } from "./db";
import type { SessionPayload } from "./session";

/**
 * A board running on the operator's own machine, for the operator alone, is
 * asked to prove who it is on every page load — and the answer is always the
 * same one person. That login is friction with nothing behind it, so this
 * turns it off, under conditions narrow enough that turning it off cannot
 * quietly become "this board has no login".
 *
 * All four have to hold:
 *
 * - the operator asked for it (`PILOTDECK_NO_LOGIN=1`);
 * - the instance is not the hosted deployment;
 * - the browser reached it over loopback, so exposing the port later does not
 *   hand the board to whoever finds it — the flag alone is not the fence;
 * - the instance has exactly one active user, so there is no question of
 *   which identity the visitor gets. Zero users still goes through /setup,
 *   which is where the first admin and the workspace come from; two or more
 *   is a board with people in it, and picking one of them silently would be
 *   the kind of guess that ends up in somebody else's audit trail.
 *
 * MCP tokens are untouched: agents keep authenticating with their bearer.
 */
export const NO_LOGIN_ENV = "PILOTDECK_NO_LOGIN";

/**
 * Set by `clearSession`: this browser signed out on purpose and does not want
 * the shortcut back until it logs in. Without it, "sair" would be a button
 * that does nothing on a no-login instance.
 */
export const NO_LOCAL_SESSION_COOKIE = "ab_no_local";

/**
 * Whether the request came from the machine the board runs on. The `host`
 * header is what the browser was pointed at, so a LAN address or a domain
 * never reads as loopback even when the flag is on.
 */
export function hostIsLoopback(host: string | null | undefined): boolean {
  if (!host) return false;
  const name = host.trim().toLowerCase();
  // drop the port, and the brackets an IPv6 host carries
  const bare = name.startsWith("[")
    ? name.slice(1, name.indexOf("]"))
    : (name.split(":")[0] ?? "");
  return bare === "localhost" || bare === "127.0.0.1" || bare === "::1";
}

export function noLoginRequested(): boolean {
  return process.env[NO_LOGIN_ENV]?.trim() === "1";
}

/** The single local user, when every condition above holds. Otherwise null. */
export async function localSession(): Promise<SessionPayload | null> {
  if (!noLoginRequested()) return null;
  if (detectDeployMode() === "hosted") return null;

  const store = await headers();
  if (!hostIsLoopback(store.get("host"))) return null;

  const jar = await cookies();
  if (jar.get(NO_LOCAL_SESSION_COOKIE)) return null;

  // limit(2) on purpose: one row is the answer, two is the refusal.
  const users = await db()
    .select({
      id: user.id,
      email: user.email,
      active: user.active,
      sessionVersion: user.sessionVersion,
    })
    .from(user)
    .where(eq(user.active, true))
    .limit(2);

  if (users.length !== 1) return null;
  const only = users[0];
  if (!only) return null;

  return {
    userId: only.id,
    email: only.email,
    sessionVersion: only.sessionVersion,
  };
}
