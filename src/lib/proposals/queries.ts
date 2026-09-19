import type { User } from "@supabase/supabase-js";
import { createSessionClient } from "@/lib/supabase/server";
import { LIST_LIMIT } from "./filters";
import type {
  ProposalComment,
  ProposalDetail,
  ProposalFilters,
  ProposalListItem,
  VoteValue,
} from "./types";


/**
 * Colonnes de la liste : pas de `payload`. `author_name` est une colonne
 * calculée PostgREST (nom d'affichage uniquement, jamais l'e-mail).
 */
const LIST_COLUMNS =
  "id, author_id, content_type, title, status, votes_up, votes_down, comments_count, created_at, author_name:content_proposals_author_name";

const DETAIL_COLUMNS = `${LIST_COLUMNS}, payload, rejection_reason, reviewed_at`;

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function listProposals(filters: ProposalFilters): Promise<ProposalListItem[]> {
  const supabase = await createSessionClient();
  let query = supabase.from("content_proposals").select(LIST_COLUMNS).eq("status", filters.status);
  if (filters.type) {
    query = query.eq("content_type", filters.type);
  }
  const { data, error } = await query.order("created_at", { ascending: false }).limit(LIST_LIMIT);
  if (error) {
    throw new Error(`Chargement des propositions impossible : ${error.message}`);
  }
  return (data ?? []) as unknown as ProposalListItem[];
}

export async function getProposal(id: string): Promise<ProposalDetail | null> {
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("content_proposals")
    .select(DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new Error(`Chargement de la proposition impossible : ${error.message}`);
  }
  return (data as unknown as ProposalDetail | null) ?? null;
}

export async function listComments(proposalId: string): Promise<ProposalComment[]> {
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("proposal_comments")
    .select("id, proposal_id, author_id, body, created_at, author_name:proposal_comments_author_name")
    .eq("proposal_id", proposalId)
    .order("created_at", { ascending: true });
  if (error) {
    throw new Error(`Chargement des commentaires impossible : ${error.message}`);
  }
  return (data ?? []) as unknown as ProposalComment[];
}

/** Vote de l'utilisateur (la RLS ne renvoie que le sien). `null` sans vote ou sans session. */
export async function getUserVote(proposalId: string, userId: string): Promise<VoteValue | null> {
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("proposal_votes")
    .select("vote")
    .eq("proposal_id", proposalId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    throw new Error(`Chargement du vote impossible : ${error.message}`);
  }
  return data?.vote === "up" || data?.vote === "down" ? data.vote : null;
}

/** Indique si la session est celle d'un admin (affichage seulement : la RLS reste la barrière). */
export async function isAdmin(): Promise<boolean> {
  const supabase = await createSessionClient();
  const { data, error } = await supabase.rpc("is_admin");
  if (error) {
    console.error("[propositions] is_admin a échoué", error.code, error.message);
    return false;
  }
  return data === true;
}
