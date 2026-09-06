"use server";

import {
  canCreateFirstAdmin,
  isValidEmail,
  isValidPassword,
  user,
} from "@pilotdeck/db";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { clearSession, setSession } from "../lib/cookies";
import { db } from "../lib/db";
import { dict } from "../lib/i18n";
import { countUsers, ensureWorkspace } from "../lib/instance";
import {
  clearLoginBudget,
  loginOrigin,
  withinLoginBudget,
} from "../lib/login-rate-limit";
import {
  ABSENT_USER_HASH,
  hashPassword,
  verifyPassword,
} from "../lib/password";

export type AuthState = { error: string } | null;

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * The words a failed submit answers with, in the workspace language. Read only
 * on the failure path: a sign-in that works never pays for this query. Before
 * setup there is no workspace to ask, and dict falls back to English.
 */
async function authCopy() {
  const ws = await db().query.workspace.findFirst();
  return dict(ws?.language).auth;
}

export async function signupAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!isValidEmail(email)) {
    return { error: (await authCopy()).errEmail };
  }
  if (!isValidPassword(password)) {
    return { error: (await authCopy()).errPassword };
  }
  if (password !== confirm) {
    return { error: (await authCopy()).errMismatch };
  }

  const existing = await countUsers();
  if (!canCreateFirstAdmin(existing)) {
    return { error: (await authCopy()).errAdminExists };
  }

  const passwordHash = await hashPassword(password);
  const [created] = await db()
    .insert(user)
    .values({ email, passwordHash })
    .returning({
      id: user.id,
      sessionVersion: user.sessionVersion,
    });

  if (!created) {
    return { error: (await authCopy()).errCreate };
  }

  await ensureWorkspace();
  await setSession({
    userId: created.id,
    sessionVersion: created.sessionVersion,
  });
  redirect("/onboarding");
}

export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");

  if (!isValidEmail(email) || !password) {
    return { error: (await authCopy()).errCredentials };
  }

  // Charged before anything below looks at whether the account exists, and
  // by the email as submitted rather than a user id, so the refusal cannot
  // become a second oracle for account existence on top of the one OCL-99
  // closed. Over budget, the answer is the exact same generic message and
  // skips verifyPassword entirely — that is the point: a drained budget
  // must not pay for scrypt either.
  const origin = await loginOrigin();
  if (!(await withinLoginBudget(db(), email, origin))) {
    return { error: (await authCopy()).errCredentials };
  }

  const [found] = await db()
    .select()
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  // Same work on every branch. Short-circuiting on `found` or on `active`
  // skipped scrypt entirely, and answering that much sooner told a caller
  // which addresses have an account, and which of those are switched off,
  // however generic the message is.
  const passwordOk = await verifyPassword(
    password,
    found?.passwordHash ?? ABSENT_USER_HASH,
  );
  if (!found || !found.active || !passwordOk) {
    return { error: (await authCopy()).errCredentials };
  }

  await clearLoginBudget(db(), email, origin);
  await setSession({
    userId: found.id,
    sessionVersion: found.sessionVersion,
  });
  redirect("/home");
}

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect("/login");
}
