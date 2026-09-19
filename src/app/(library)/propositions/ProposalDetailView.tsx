import Link from "next/link";
import { annotateSections, diffContent } from "@/lib/proposals/diff";
import type { ExistingContent } from "@/lib/proposals/existing";
import { authorLabel, formatProposalDate, renderPayload } from "@/lib/proposals/format";
import { libraryHref } from "@/lib/proposals/target";
import type { ProposalComment, ProposalDetail, VoteValue } from "@/lib/proposals/types";
import { CommentForm } from "./CommentForm";
import { PayloadSections } from "./PayloadSections";
import { ProposalChanges } from "./ProposalChanges";
import { ModificationBadge, ProposalScore, StatusBadge, TypeBadge } from "./ProposalBadges";
import { DeleteCommentButton, DeleteProposalButton, ReviewPanel } from "./ProposalControls";
import { VoteControls } from "./VoteControls";
import styles from "./propositions.module.css";

/** État de l'élément visé par une proposition de modification, tel que rechargé à l'affichage. */
export type ProposalTarget =
  | { status: "found"; existing: ExistingContent }
  | { status: "missing" }
  | { status: "error" };

export interface ProposalDetailViewProps {
  proposal: ProposalDetail;
  /** Renseigné pour une modification (`target_id` non nul) ; absent = chargement impossible. */
  target?: ProposalTarget;
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
  target,
  comments,
  userId,
  userVote,
  isAdmin,
  returnTo,
  closeHref,
}: ProposalDetailViewProps) {
  const rendered = renderPayload(proposal.content_type, proposal.payload);
  const { rows, description } = rendered;
  const isModification = proposal.target_id !== null && proposal.target_id !== undefined;
  const found = isModification && target?.status === "found" ? target.existing : null;
  // Le diff est recalculé à chaque affichage contre l'existant COURANT ; il ne peut pas planter sur un payload malformé.
  const diff = found
    ? diffContent(proposal.content_type, found, { title: proposal.title, payload: proposal.payload })
    : null;
  const sections = diff ? annotateSections(rendered.sections, diff) : rendered.sections;
  const changedRows = new Set(diff?.changedRows ?? []);
  const isAuthor = userId !== null && userId === proposal.author_id;
  const reviewedDate = formatProposalDate(proposal.reviewed_at);

  return (
    <div className={styles.detail}>
      <h1>{proposal.title}</h1>

      <div className={styles.meta}>
        <TypeBadge type={proposal.content_type} />
        {isModification ? <ModificationBadge /> : null}
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

      {isModification ? (
        <p className={styles.targetLine}>
          {found ? (
            <>
              Modification de <strong>« {found.title || "(sans nom)"} »</strong> (
              <Link href={libraryHref(proposal.content_type, found.id)}>voir la fiche actuelle</Link>)
            </>
          ) : (
            <>Modification d&apos;un élément de la bibliothèque (n° {proposal.target_id})</>
          )}
        </p>
      ) : null}
      {isModification && target?.status === "missing" ? (
        <p className={styles.targetMissing} role="note">
          Cet élément n&apos;existe plus dans la bibliothèque : la comparaison n&apos;est pas possible.
        </p>
      ) : null}
      {isModification && (target === undefined || target.status === "error") ? (
        <p className={styles.targetMissing} role="note">
          Impossible de charger la version actuelle pour la comparer pour le moment.
        </p>
      ) : null}

      {diff ? <ProposalChanges diff={diff} /> : null}

      <dl className={styles.detailGrid}>
        {rows.map((row) => (
          <div key={row.label} className={changedRows.has(row.label) ? styles.rowChanged : undefined}>
            <dt>
              {row.label}
              {changedRows.has(row.label) ? <span className={styles.itemMark}>modifié</span> : null}
            </dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>

      {description ? (
        <p className={styles.description}>
          {diff?.descriptionChanged ? <span className={styles.itemMark}>modifiée</span> : null}
          {diff?.descriptionChanged ? " " : null}
          {description}
        </p>
      ) : null}

      <PayloadSections sections={sections} />

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
