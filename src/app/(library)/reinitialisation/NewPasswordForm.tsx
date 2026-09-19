"use client";

import Link from "next/link";
import { useActionState } from "react";
import { updatePassword, type UpdatePasswordState } from "../connexion/actions";
import styles from "../connexion/connexion.module.css";

const INITIAL_STATE: UpdatePasswordState = {};

export function NewPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, INITIAL_STATE);

  if (state.done) {
    return (
      <>
        <p role="status" className={styles.success}>
          Ton mot de passe a été mis à jour. Tu es connecté.
        </p>
        <p className={styles.hint}>
          <Link href="/sorts">Retour à la bibliothèque</Link>
        </p>
      </>
    );
  }

  return (
    <form action={formAction} className={styles.form}>
      <div className={styles.field}>
        <label htmlFor="new-password">Nouveau mot de passe</label>
        <input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="new-password-confirmation">Confirmer le mot de passe</label>
        <input
          id="new-password-confirmation"
          name="confirmation"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
        />
      </div>

      {state.error ? (
        <p role="alert" className={styles.error}>
          {state.error}
        </p>
      ) : null}

      <button type="submit" disabled={pending}>
        {pending ? "Mise à jour…" : "Enregistrer le mot de passe"}
      </button>
    </form>
  );
}
