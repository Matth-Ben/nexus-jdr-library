import { authorLabel, formatProposalDate, renderPayload } from "@/lib/proposals/format";
import type { ProposalComment, ProposalDetail, VoteValue } from "@/lib/proposals/types";
import { CommentForm } from "./CommentForm";
import { ProposalScore, StatusBadge, TypeBadge } from "./ProposalBadges";
import { DeleteCommentButton, DeleteProposalButton, ReviewPanel } from "./ProposalControls";
import { VoteControls } from "./VoteControls";
import styles from "./propositions.module.css";

export interface ProposalDetailViewProps {
  proposal: ProposalDetail;
  comments: ProposalComment[];
  /** `null` pour un visiteur non connecté. */
  userId: string | null;
  userVote: VoteValue | null;
  isAdmin: boolean;
  /** URL courante (panneau ouvert) : retour après connexion. */
  returnTo: string;
  /** URL de la liste sans `?open=` : retour après retrait de la proposition. */
  closeHref: string;
}

export function ProposalDetailView({
  proposal,
  comments,
  userId,
  userVote,
  isAdmin,
  returnTo,
  closeHref,
}: ProposalDetailViewProps) {
  const { rows, description } = renderPayload(proposal.content_type, proposal.payload);
  const isAuthor = userId !== null && userId === proposal.author_id;
  const reviewedDate = formatProposalDate(proposal.reviewed_at);

  return (
    <div className={styles.detail}>
      <h1>{proposal.title}</h1>

      <div className={styles.meta}>
        <TypeBadge type={proposal.content_type} />
        <StatusBadge status={proposal.status} />
        <span>
          Proposé par {authorLabel(proposal.author_name)} le {formatProposalDate(proposal.created_at)}
        </span>
        <ProposalScore up={proposal.votes_up} down={proposal.votes_down} comments={proposal.comments_count} />
      </div>

      {proposal.status === "rejected" ? (
        <div className={styles.reason} role="note">
          <strong>Proposition refusée{reviewedDate ? ` le ${reviewedDate}` : ""}.</strong>
          {proposal.rejection_reason ? <p>Motif : {proposal.rejection_reason}</p> : null}
        </div>
      ) : null}

      <dl className={styles.detailGrid}>
        {rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>

      {description ? <p className={styles.description}>{description}</p> : null}

      <section className={styles.section} aria-label="Avis">
        <h2>Ton avis</h2>
        <VoteControls
          proposalId={proposal.id}
          authorId={proposal.author_id}
          status={proposal.status}
          votesUp={proposal.votes_up}
          votesDown={proposal.votes_down}
          userId={userId}
          userVote={userVote}
          returnTo={returnTo}
        />
      </section>

      <section className={styles.section} aria-label="Commentaires">
        <h2>Commentaires ({comments.length})</h2>
        {comments.length === 0 ? (
          <p className={styles.hint}>Aucun commentaire pour le moment.</p>
        ) : (
          <ul className={styles.comments}>
            {comments.map((comment) => (
              <li key={comment.id} className={styles.comment}>
                <div className={styles.commentMeta}>
                  <span>
                    <strong>{authorLabel(comment.author_name)}</strong> · {formatProposalDate(comment.created_at)}
                  </span>
                  {userId !== null && (comment.author_id === userId || isAdmin) ? (
                    <DeleteCommentButton commentId={comment.id} returnTo={returnTo} />
                  ) : null}
                </div>
                <p className={styles.commentBody}>{comment.body}</p>
              </li>
            ))}
          </ul>
        )}
        <CommentForm proposalId={proposal.id} signedIn={userId !== null} returnTo={returnTo} />
      </section>

      {isAuthor && proposal.status === "pending" ? (
        <DeleteProposalButton proposalId={proposal.id} closeHref={closeHref} />
      ) : null}

      {isAdmin && proposal.status === "pending" ? (
        <ReviewPanel proposalId={proposal.id} returnTo={returnTo} />
      ) : null}
    </div>
  );
}
