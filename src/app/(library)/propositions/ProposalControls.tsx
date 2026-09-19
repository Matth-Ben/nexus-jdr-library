"use client";

import { useActionState, useState } from "react";
import { REASON_MAX } from "@/lib/proposals/payload";
import { deleteComment, deleteProposal, reviewProposal, type ActionState } from "./actions";
import styles from "./propositions.module.css";

const INITIAL_STATE: ActionState = {};

/** Bouton « Supprimer » d'un commentaire (auteur du commentaire ou admin). */
export function DeleteCommentButton({ commentId, returnTo }: { commentId: string; returnTo: string }) {
  const [state, formAction, pending] = useActionState(deleteComment, INITIAL_STATE);
  return (
    <form action={formAction}>
      <input type="hidden" name="comment_id" value={commentId} />
      <input type="hidden" name="next" value={returnTo} />
      <button type="submit" className={styles.linkButton} disabled={pending}>
        {pending ? "Suppression…" : "Supprimer"}
      </button>
      {state.error ? (
        <span role="alert" className={styles.inlineError}>
          {" "}
          {state.error}
        </span>
      ) : null}
    </form>
  );
}

/** « Retirer ma proposition » avec confirmation en deux temps (auteur, tant que la proposition est en attente). */
export function DeleteProposalButton({
  proposalId,
  closeHref,
}: {
  proposalId: string;
  /** Liste sans `?open=`, où l'on revient après le retrait. */
  closeHref: string;
}) {
  const [state, formAction, pending] = useActionState(deleteProposal, INITIAL_STATE);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className={styles.section}>
      {confirming ? (
        <form action={formAction} className={styles.actions}>
          <input type="hidden" name="proposal_id" value={proposalId} />
          <input type="hidden" name="next" value={closeHref} />
          <span className={styles.hint}>Retirer définitivement ta proposition ?</span>
          <button type="submit" className={styles.dangerButton} disabled={pending}>
            {pending ? "Retrait…" : "Oui, la retirer"}
          </button>
          <button type="button" className={styles.secondaryButton} onClick={() => setConfirming(false)} disabled={pending}>
            Annuler
          </button>
        </form>
      ) : (
        <div className={styles.actions}>
          <button type="button" className={styles.dangerButton} onClick={() => setConfirming(true)}>
            Retirer ma proposition
          </button>
        </div>
      )}
      {state.error ? (
        <p role="alert" className={styles.inlineError}>
          {state.error}
        </p>
      ) : null}
    </div>
  );
}

/** Bloc admin : approuver / refuser (motif optionnel). Affiché seulement si `is_admin`. */
export function ReviewPanel({ proposalId, returnTo }: { proposalId: string; returnTo: string }) {
  const [state, formAction, pending] = useActionState(reviewProposal, INITIAL_STATE);
  const [reasonLength, setReasonLength] = useState(0);

  return (
    <form action={formAction} className={`${styles.reviewForm} ${styles.admin}`} aria-label="Modération">
      <h2>Modération</h2>
      <input type="hidden" name="proposal_id" value={proposalId} />
      <input type="hidden" name="next" value={returnTo} />
      <div className={styles.field}>
        <label htmlFor={`review-reason-${proposalId}`}>Motif du refus (optionnel)</label>
        <textarea
          id={`review-reason-${proposalId}`}
          name="reason"
          maxLength={REASON_MAX}
          onChange={(event) => setReasonLength([...event.target.value].length)}
        />
        <span className={styles.counter}>
          {reasonLength} / {REASON_MAX}
        </span>
      </div>
      <div className={styles.actions}>
        <button type="submit" name="decision" value="approved" className={styles.button} disabled={pending}>
          Approuver
        </button>
        <button type="submit" name="decision" value="rejected" className={styles.dangerButton} disabled={pending}>
          Refuser
        </button>
      </div>
      {state.error ? (
        <p role="alert" className={styles.inlineError}>
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
