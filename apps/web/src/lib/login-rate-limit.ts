import { loginFailure } from "@pilotdeck/db";
import { headers } from "next/headers";
import { clearBudget, spendBudget } from "./attempt-budget";
import type { McpDatabase } from "../mcp/types";

/**
 * Failed logins one identifier may spend inside a window before the endpoint
 * stops paying for the scrypt call at all.
 *
 * OCL-99 made every failing login pay for one scrypt verification, real
 * account or not, to close a timing gap that told a caller which addresses
 * exist. That is the right trade, but it turned "no rate limit" from
 * inconvenient into a CPU-exhaustion vector: verifyPassword runs on the
 * libuv threadpool (4 threads by default), so unauthenticated garbage now
 * occupies the same threads real logins need.
 *
 * 8 failures in 15 minutes is picked to survive a genuine mistyped-password
 * afternoon (a human retyping a forgotten password, an old saved credential
 * in a second browser) without giving a guesser more than a token number of
 * scrypt calls per identifier. It is a product call, not a security
 * invariant — see the PR description for the number actually shipped.
 */
export const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
export const MAX_LOGIN_FAILURES = 8;

/**
 * Which buckets an attempt is charged to.
 *
 * The decision to refuse must never depend on whether the account exists —
 * that is exactly the oracle OCL-99 closed — so the primary bucket is the
 * email as submitted, existing or not. A second bucket by origin is layered
 * on top, same as `pairingFailureScope` in `pairing.ts`: undeclared
 * (`PILOTDECK_TRUSTED_PROXY` unset) everyone shares one shared bucket, which
 * still refuses a burst without being able to single a caller out.
 */
function loginFailureScope(kind: "email" | "origin", value: string): string {
  return `login-${kind}:${value}`;
}

/**
 * The caller's origin, as far as this deployment can honestly tell — see
 * `guessOrigin` in `app/api/pair/route.ts`, which this mirrors. Trusting a
 * forwarded-for header on a directly exposed instance would hand a guesser a
 * fresh budget per request just by varying a string, so it only counts where
 * the deploy declares it sits behind a proxy. Server Actions do not receive
 * a `Request`, so this reads `next/headers` instead; guarded so a caller
 * outside a request scope (a unit test invoking the action directly) simply
 * sees no origin rather than throwing — the same behaviour as an undeclared
 * proxy.
 */
export async function loginOrigin(): Promise<string | null> {
  if (process.env.PILOTDECK_TRUSTED_PROXY !== "1") return null;
  try {
    const store = await headers();
    const forwarded = store.get("x-forwarded-for");
    if (!forwarded) return store.get("x-real-ip");
    const hops = forwarded
      .split(",")
      .map((hop) => hop.trim())
      .filter(Boolean);
    return hops.at(-1) ?? null;
  } catch {
    return null;
  }
}

/**
 * Charges one attempt to both buckets and reports whether the login may
 * proceed to `verifyPassword`. Both are always spent — never short-circuited
 * on the first bucket's answer — so which bucket trips first cannot become a
 * second timing signal.
 */
export async function withinLoginBudget(
  db: McpDatabase,
  email: string,
  origin: string | null,
): Promise<boolean> {
  const emailOk = await spendBudget(
    db,
    loginFailure,
    loginFailureScope("email", email),
    MAX_LOGIN_FAILURES,
    LOGIN_ATTEMPT_WINDOW_MS,
  );
  const originOk = origin
    ? await spendBudget(
        db,
        loginFailure,
        loginFailureScope("origin", origin),
        MAX_LOGIN_FAILURES,
        LOGIN_ATTEMPT_WINDOW_MS,
      )
    : true;
  return emailOk && originOk;
}

/** A successful login clears both budgets: nobody there was guessing. */
export async function clearLoginBudget(
  db: McpDatabase,
  email: string,
  origin: string | null,
): Promise<void> {
  await clearBudget(db, loginFailure, loginFailureScope("email", email));
  if (origin) {
    await clearBudget(db, loginFailure, loginFailureScope("origin", origin));
  }
}
