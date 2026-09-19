"use client";

import Link from "next/link";
import { useActionState } from "react";
import { voteAvailability, VOTE_BLOCK_MESSAGES } from "@/lib/proposals/voting";
import type { ProposalStatus, VoteValue } from "@/lib/proposals/types";
import { castVote, type ActionState } from "./actions";
import styles from "./propositions.module.css";

export interface VoteControlsProps {
  proposalId: string;
  authorId: string;
  status: ProposalStatus;
  votesUp: number;
  votesDown: number;
  /** `null` pour un visiteur non connecté. */
  userId: string | null;
  /** Vote actuel de l'utilisateur, `null` s'il n'a pas voté. */
  userVote: VoteValue | null;
  /** URL courante (panneau ouvert), pour revenir ici après connexion. */
  returnTo: string;
}

const INITIAL_STATE: ActionState = {};

function VoteButton({
  vote,
  count,
  active,
  disabled,
}: {
  vote: VoteValue;
  count: number;
  active: boolean;
  disabled: boolean;
}) {
  const label = vote === "up" ? "Pour" : "Contre";
  return (
    <button
      type="submit"
      name="vote"
      value={vote}
      aria-pressed={active}
      disabled={disabled}
      aria-label={`${label} : ${count}${active ? " (ton vote, clique pour le retirer)" : ""}`}
      className={`${styles.voteButton} ${active ? styles.voteButtonActive : ""}`}
    >
      {vote === "up" ? "👍" : "👎"} {count}
    </button>
  );
}

export function VoteControls({
  proposalId,
  authorId,
  status,
  votesUp,
  votesDown,
  userId,
  userVote,
  returnTo,
}: VoteControlsProps) {
  const [state, formAction, pending] = useActionState(castVote, INITIAL_STATE);
  const availability = voteAvailability({ userId, authorId, status });
  const disabled = !availability.canVote || pending;

  return (
    <div className={styles.section}>
      <form action={formAction} className={styles.voteRow} aria-label="Voter">
        <input type="hidden" name="proposal_id" value={proposalId} />
        <input type="hidden" name="next" value={returnTo} />
        <VoteButton
          vote="up"
          count={votesUp}
          active={userVote === "up"}
          disabled={disabled}
        />
        <VoteButton
          vote="down"
          count={votesDown}
          active={userVote === "down"}
          disabled={disabled}
        />
      </form>

      {availability.reason === "anonymous" ? (
        <p className={styles.hint}>
          <Link href={`/connexion?next=${encodeURIComponent(returnTo)}`}>Connecte-toi pour voter</Link>. Le vote est un
          avis : il ne décide pas du sort de la proposition.
        </p>
      ) : availability.reason ? (
        <p className={styles.hint}>{VOTE_BLOCK_MESSAGES[availability.reason]}</p>
      ) : (
        <p className={styles.hint}>
          Le vote est un avis : il ne décide pas du sort de la proposition. Clique sur ton vote pour le retirer.
        </p>
      )}

      {state.error ? (
        <p role="alert" className={styles.inlineError}>
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
