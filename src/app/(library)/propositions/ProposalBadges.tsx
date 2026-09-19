import { STATUS_LABELS, TYPE_LABELS } from "@/lib/proposals/format";
import type { ProposalStatus, ProposalType } from "@/lib/proposals/types";
import styles from "./propositions.module.css";

const STATUS_CLASS: Record<ProposalStatus, string> = {
  pending: styles.statusPending,
  approved: styles.statusApproved,
  rejected: styles.statusRejected,
};

export function TypeBadge({ type }: { type: ProposalType }) {
  return <span className={styles.badge}>{TYPE_LABELS[type]}</span>;
}

export function StatusBadge({ status }: { status: ProposalStatus }) {
  return <span className={`${styles.badge} ${STATUS_CLASS[status]}`}>{STATUS_LABELS[status]}</span>;
}

export function ProposalScore({
  up,
  down,
  comments,
}: {
  up: number;
  down: number;
  comments: number;
}) {
  return (
    <>
      <span role="img" aria-label={`${up} ${up > 1 ? "votes pour" : "vote pour"}`}>
        👍 {up}
      </span>
      <span role="img" aria-label={`${down} ${down > 1 ? "votes contre" : "vote contre"}`}>
        👎 {down}
      </span>
      <span role="img" aria-label={`${comments} ${comments > 1 ? "commentaires" : "commentaire"}`}>
        💬 {comments}
      </span>
    </>
  );
}
