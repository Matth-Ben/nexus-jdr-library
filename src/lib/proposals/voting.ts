import type { ProposalStatus } from "./types";

export type VoteBlockReason = "anonymous" | "author" | "closed";

export interface VoteAvailability {
  canVote: boolean;
  reason?: VoteBlockReason;
}

/**
 * Règles côté interface (la RLS reste la vraie barrière) : il faut être
 * connecté, ne pas être l'auteur, et que la proposition soit en attente.
 * Ordre de priorité des explications : connexion, puis auteur, puis statut.
 */
export function voteAvailability(input: {
  userId: string | null;
  authorId: string;
  status: ProposalStatus;
}): VoteAvailability {
  if (!input.userId) return { canVote: false, reason: "anonymous" };
  if (input.userId === input.authorId) return { canVote: false, reason: "author" };
  if (input.status !== "pending") return { canVote: false, reason: "closed" };
  return { canVote: true };
}

export const VOTE_BLOCK_MESSAGES: Record<Exclude<VoteBlockReason, "anonymous">, string> = {
  author: "Tu ne peux pas voter pour ta propre proposition.",
  closed: "Les votes sont clos : cette proposition a déjà été traitée.",
};

/** Vote à écrire selon le vote actuel : recliquer sur son vote le retire. */
export function nextVote(current: "up" | "down" | null, clicked: "up" | "down"): "up" | "down" | null {
  return current === clicked ? null : clicked;
}
