"use client";

import { useActionState, useMemo, useState } from "react";
import { Icon } from "../../components/icon";
import { signupAction, type AuthState } from "../../actions/auth";
import { dict } from "../../lib/i18n";

export function SetupForm({ lang }: { lang: string }) {
  const t = dict(lang);
  const [state, action, pending] = useActionState<AuthState, FormData>(
    signupAction,
    null,
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const longEnough = password.length >= 8;
  const matches = confirm.length > 0 && confirm === password;

  const valid = useMemo(() => {
    return email.includes("@") && longEnough && confirm === password;
  }, [email, longEnough, confirm, password]);

  return (
    <form action={action}>
      <div className="field">
        <label htmlFor="setup-email">
          <span>{t.auth.email}</span>
        </label>
        <input
          id="setup-email"
          className="input"
          name="email"
          type="email"
          autoComplete="username"
          autoFocus
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="setup-password">
          <span>{t.auth.password}</span>
        </label>
        <input
          id="setup-password"
          className="input"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-describedby="setup-password-rule"
        />
        {/* The rule is stated before it is broken. The submit below is gated
            on it, and a button that is dead for a reason nobody printed is
            the same thing as a button that is broken. */}
        {/* Neutral while nothing has been typed, met once it is met, and
            broken only when somebody actually contradicts it: a five character
            password is the one case where the rule is not guidance any more,
            and it is the case where the dead submit needs explaining. */}
        <p
          className={`auth-rule${
            longEnough ? " ok" : password.length > 0 ? " bad" : ""
          }`}
          id="setup-password-rule"
        >
          {longEnough ? <Icon name="check" label={null} size={12} /> : null}
          {t.auth.passwordRule}
        </p>
      </div>
      <div className="field">
        <label htmlFor="setup-confirm">
          <span>{t.auth.confirmPassword}</span>
        </label>
        <input
          id="setup-confirm"
          className="input"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={confirm.length > 0 && !matches ? true : undefined}
          aria-describedby={
            confirm.length > 0 && !matches ? "setup-confirm-rule" : undefined
          }
        />
        {confirm.length > 0 && !matches ? (
          <p className="auth-rule bad" id="setup-confirm-rule">
            {t.auth.confirmMismatch}
          </p>
        ) : null}
      </div>
      {state?.error ? (
        <p className="auth-err" role="alert">
          {state.error}
        </p>
      ) : null}
      <button className="btn-next" type="submit" disabled={!valid || pending}>
        {pending ? t.auth.creating : t.auth.createAccount}
      </button>
    </form>
  );
}
