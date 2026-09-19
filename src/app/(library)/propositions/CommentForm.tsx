"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { COMMENT_MAX } from "@/lib/proposals/payload";
import { addComment, type ActionState } from "./actions";
import styles from "./propositions.module.css";

const INITIAL_STATE: ActionState = {};

export function CommentForm({
  proposalId,
  signedIn,
  returnTo,
}: {
  proposalId: string;
  signedIn: boolean;
  returnTo: string;
}) {
  const [state, formAction, pending] = useActionState(addComment, INITIAL_STATE);
  const [length, setLength] = useState(0);

  if (!signedIn) {
    return (
      <p className={styles.hint}>
        <Link href={`/connexion?next=${encodeURIComponent(returnTo)}`}>Connecte-toi pour commenter</Link>.
      </p>
    );
  }

  const over = length > COMMENT_MAX;

  return (
    <form
      action={formAction}
      className={styles.commentForm}
      // Le formulaire est vidé par React après l'action : on remet aussi le compteur à zéro.
      onReset={() => setLength(0)}
    >
      <input type="hidden" name="proposal_id" value={proposalId} />
      <input type="hidden" name="next" value={returnTo} />
      <label htmlFor={`comment-body-${proposalId}`}>Ajouter un commentaire</label>
      <textarea
        id={`comment-body-${proposalId}`}
        name="body"
        // `key` : après une erreur, on repart de la valeur conservée par le serveur.
        key={state.body ?? "empty"}
        defaultValue={state.body ?? ""}
        onChange={(event) => setLength([...event.target.value].length)}
        aria-invalid={state.error ? true : undefined}
        aria-describedby={state.error ? `comment-error-${proposalId}` : undefined}
        required
      />
      <span className={`${styles.counter} ${over ? styles.counterOver : ""}`}>
        {length} / {COMMENT_MAX}
      </span>
      {state.error ? (
        <p role="alert" id={`comment-error-${proposalId}`} className={styles.inlineError}>
          {state.error}
        </p>
      ) : null}
      <div className={styles.actions}>
        <button type="submit" className={styles.button} disabled={pending}>
          {pending ? "Publication…" : "Publier"}
        </button>
      </div>
    </form>
  );
}
