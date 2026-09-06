"use client";

import { useActionState } from "react";
import { loginAction, type AuthState } from "../../actions/auth";
import { dict } from "../../lib/i18n";

export function LoginForm({ lang }: { lang: string }) {
  const t = dict(lang);
  const [state, action, pending] = useActionState<AuthState, FormData>(
    loginAction,
    null,
  );

  return (
    <form action={action}>
      <div className="field">
        <label htmlFor="login-email">
          <span>{t.auth.email}</span>
        </label>
        <input
          id="login-email"
          className="input"
          name="email"
          type="email"
          autoComplete="username"
          autoFocus
          required
          aria-invalid={state?.error ? true : undefined}
          aria-describedby={state?.error ? "login-error" : undefined}
        />
      </div>
      <div className="field">
        <label htmlFor="login-password">
          <span>{t.auth.password}</span>
        </label>
        <input
          id="login-password"
          className="input"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={state?.error ? true : undefined}
          aria-describedby={state?.error ? "login-error" : undefined}
        />
      </div>
      {/* The failure belongs to the pair of fields above it, and it is
          announced: a sign-in that silently does nothing is the worst state
          this screen has. */}
      {state?.error ? (
        <p className="auth-err" id="login-error" role="alert">
          {state.error}
        </p>
      ) : null}
      <button className="btn-next" type="submit" disabled={pending}>
        {pending ? t.auth.signingIn : t.auth.signIn}
      </button>
    </form>
  );
}
