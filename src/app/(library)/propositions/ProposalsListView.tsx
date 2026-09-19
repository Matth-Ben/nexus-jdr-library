import Link from "next/link";
import { authorLabel, formatProposalDate, STATUS_LABELS, TYPE_LABELS } from "@/lib/proposals/format";
import { filterParams, LIST_LIMIT } from "@/lib/proposals/filters";
import { PROPOSAL_STATUSES, PROPOSAL_TYPES, type ProposalFilters, type ProposalListItem } from "@/lib/proposals/types";
import { panelHref } from "@/lib/panel";
import { ProposalScore, StatusBadge, TypeBadge } from "./ProposalBadges";
import styles from "./propositions.module.css";

export interface ProposalsListViewProps {
  proposals: ProposalListItem[];
  filters: ProposalFilters;
  /** Vrai si le chargement depuis Supabase a échoué. */
  loadError: boolean;
  /** Proposition ouverte dans le panneau (`?open=`), mise en surbrillance. */
  openId?: string;
}

export function ProposalsListView({ proposals, filters, loadError, openId }: ProposalsListViewProps) {
  const params = filterParams(filters);
  const statusLabel = STATUS_LABELS[filters.status].toLowerCase();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Propositions</h1>
        <Link href="/propositions/nouvelle" className={styles.primaryLink}>
          Proposer du contenu
        </Link>
      </div>

      <form className={styles.filters} method="get">
        <div className={styles.field}>
          <label htmlFor="proposal-filter-status">Statut</label>
          <select id="proposal-filter-status" name="statut" defaultValue={filters.status}>
            {PROPOSAL_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="proposal-filter-type">Type</label>
          <select id="proposal-filter-type" name="type" defaultValue={filters.type ?? ""}>
            <option value="">Tous les types</option>
            {PROPOSAL_TYPES.map((type) => (
              <option key={type} value={type}>
                {TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
        <button type="submit">Filtrer</button>
      </form>

      {loadError ? (
        <p role="alert" className={styles.error}>
          Impossible de charger les propositions pour le moment. Réessaie plus tard.
        </p>
      ) : proposals.length === 0 ? (
        <p className={styles.empty}>
          {filters.type
            ? `Aucune proposition ${statusLabel} de ce type pour le moment.`
            : `Aucune proposition ${statusLabel} pour le moment.`}
        </p>
      ) : (
        <>
          <p className={styles.summary}>
            {proposals.length} {proposals.length > 1 ? "propositions" : "proposition"}
            {proposals.length >= LIST_LIMIT ? ` (les ${LIST_LIMIT} plus récentes)` : ""}
          </p>
          <ul className={styles.list}>
            {proposals.map((proposal) => {
              const active = openId === proposal.id;
              return (
                <li key={proposal.id} className={styles.row}>
                  <Link
                    href={panelHref("/propositions", params, proposal.id)}
                    scroll={false}
                    aria-current={active ? "true" : undefined}
                    className={`${styles.rowLink} ${active ? styles.rowLinkActive : ""}`}
                  >
                    <span className={styles.rowTop}>
                      <span className={styles.name}>{proposal.title}</span>
                      <TypeBadge type={proposal.content_type} />
                      <StatusBadge status={proposal.status} />
                    </span>
                    <span className={styles.meta}>
                      <span>
                        {authorLabel(proposal.author_name)} · {formatProposalDate(proposal.created_at)}
                      </span>
                      <ProposalScore
                        up={proposal.votes_up}
                        down={proposal.votes_down}
                        comments={proposal.comments_count}
                      />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
