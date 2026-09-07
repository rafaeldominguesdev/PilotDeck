import { user } from "@pilotdeck/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  readSessionToken,
  signSession,
  type SessionPayload,
  type SessionTokenPayload,
} from "./session";
import { db } from "./db";
import { NO_LOCAL_SESSION_COOKIE, localSession } from "./local-session";

/**
 * Who is browsing. The signed cookie answers first; a local single-user
 * instance that asked to skip the login answers second (see `local-session`).
 */
export async function getSession(): Promise<SessionPayload | null> {
  return (await sessionFromCookie()) ?? (await localSession());
}

async function sessionFromCookie(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await readSessionToken(token);
  if (!session) return null;

  const [found] = await db()
    .select({
      id: user.id,
      email: user.email,
      active: user.active,
      sessionVersion: user.sessionVersion,
    })
    .from(user)
    .where(eq(user.id, session.userId))
    .limit(1);

  if (
    !found ||
    !found.active ||
    found.sessionVersion !== session.sessionVersion
  ) {
    return null;
  }

  return {
    userId: found.id,
    email: found.email,
    sessionVersion: found.sessionVersion,
  };
}

export async function setSession(payload: SessionTokenPayload): Promise<void> {
  const token = await signSession(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  // logging in again takes back the "I signed out" mark, so a local instance
  // returns to skipping the login next time.
  store.delete(NO_LOCAL_SESSION_COOKIE);
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  // On a no-login local instance, deleting the cookie would sign nobody out:
  // the next page load would hand the same user straight back. Signing out is
  // a deliberate act, so this browser stops taking the shortcut until it logs
  // in again — otherwise the button lies.
  store.set(NO_LOCAL_SESSION_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}
