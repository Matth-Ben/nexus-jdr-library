"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "./actions";
import styles from "./connexion.module.css";

const INITIAL_STATE: LoginState = {};

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signIn, INITIAL_STATE);

  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="next" value={next} />

      <div className={styles.field}>
        <label htmlFor="login-email">E-mail</label>
        <input id="login-email" name="email" type="email" autoComplete="email" required />
      </div>

      <div className={styles.field}>
        <label htmlFor="login-password">Mot de passe</label>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      {state.error ? (
        <p role="alert" className={styles.error}>
          {state.error}
        </p>
      ) : null}

      <button type="submit" disabled={pending}>
        {pending ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
