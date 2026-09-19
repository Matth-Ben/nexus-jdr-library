"use client";

import { useActionState } from "react";
import { requestPasswordReset, type ResetRequestState } from "../connexion/actions";
import styles from "../connexion/connexion.module.css";

const INITIAL_STATE: ResetRequestState = {};

export function ForgotPasswordForm({ linkFailed }: { linkFailed: boolean }) {
  const [state, formAction, pending] = useActionState(requestPasswordReset, INITIAL_STATE);

  if (state.sent) {
    return (
      <p role="status" className={styles.success}>
        Si un compte existe pour cette adresse, un e-mail contenant un lien de réinitialisation vient
        d&apos;être envoyé. Pense à vérifier tes courriers indésirables. Ouvre le lien dans ce même
        navigateur.
      </p>
    );
  }

  return (
    <form action={formAction} className={styles.form}>
      {linkFailed ? (
        <p role="alert" className={styles.error}>
          Ce lien est invalide ou a expiré. Demande un nouvel e-mail ci-dessous.
        </p>
      ) : null}

      <div className={styles.field}>
        <label htmlFor="reset-email">E-mail</label>
        <input id="reset-email" name="email" type="email" autoComplete="email" required />
      </div>

      {state.error ? (
        <p role="alert" className={styles.error}>
          {state.error}
        </p>
      ) : null}

      <button type="submit" disabled={pending}>
        {pending ? "Envoi…" : "Envoyer le lien"}
      </button>
    </form>
  );
}
