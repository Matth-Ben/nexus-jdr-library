/**
 * Types des propositions de contenu — voir la migration
 * `20260919090000_create_content_proposals.sql` du dépôt web (source de vérité).
 */

export const PROPOSAL_TYPES = ["spell", "feat", "item", "race", "class"] as const;
export type ProposalType = (typeof PROPOSAL_TYPES)[number];

export const PROPOSAL_STATUSES = ["pending", "approved", "rejected"] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export type VoteValue = "up" | "down";

/** Ligne de la liste (sans `payload`, volumineux et inutile ici). */
export interface ProposalListItem {
  id: string;
  author_id: string;
  /** Nom d'affichage (`user_metadata.full_name`), `null` si non renseigné. Jamais l'e-mail. */
  author_name: string | null;
  content_type: ProposalType;
  title: string;
  status: ProposalStatus;
  votes_up: number;
  votes_down: number;
  comments_count: number;
  created_at: string;
}

/** Proposition complète. `payload` est `unknown` : rien ne l'a validé côté base. */
export interface ProposalDetail extends ProposalListItem {
  payload: unknown;
  rejection_reason: string | null;
  reviewed_at: string | null;
}

export interface ProposalComment {
  id: string;
  proposal_id: string;
  author_id: string;
  author_name: string | null;
  body: string;
  created_at: string;
}

export interface ProposalFilters {
  status: ProposalStatus;
  type?: ProposalType;
}
