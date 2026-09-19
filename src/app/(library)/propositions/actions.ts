"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/auth/redirect";
import { isUuid } from "@/lib/proposals/filters";
import { validateComment, validateProposal, validateReason, type FieldErrors } from "@/lib/proposals/payload";
import { nextVote } from "@/lib/proposals/voting";
import { createSessionClient } from "@/lib/supabase/server";

/**
 * Actions serveur des propositions. Règles communes :
 *  - `getUser()` d'abord (sinon redirection vers la connexion) ;
 *  - toutes les entrées du client sont revalidées ;
 *  - `author_id` / `user_id` viennent de la session, jamais du formulaire ;
 *  - en cas d'échec Supabase : détail loggé côté serveur, message français
 *    générique renvoyé (la RLS reste la vraie barrière).
 */

export interface ProposalFormState {
  errors?: FieldErrors;
  /** Valeurs saisies, renvoyées pour préremplir le formulaire après une erreur. */
  values?: Record<string, string>;
}

export interface ActionState {
  error?: string;
  /** Texte du commentaire à conserver après une erreur. */
  body?: string;
  ok?: boolean;
}

const GENERIC_ERROR = "Action impossible pour le moment. Réessaie plus tard.";

/** Chemin de retour : interne et limité à la section propositions. */
function returnPath(formData: FormData): string {
  const path = safeNextPath(formData.get("next"));
  return path === "/propositions" || path.startsWith("/propositions?") || path.startsWith("/propositions/")
    ? path
    : "/propositions";
}

async function requireUser(next: string) {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/connexion?next=${encodeURIComponent(next)}`);
  }
  return { supabase, user };
}

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function logFailure(action: string, error: { code?: string; message?: string }): void {
  console.error(`[propositions] ${action} a échoué`, error.code, error.message);
}

export async function createProposal(_previous: ProposalFormState, formData: FormData): Promise<ProposalFormState> {
  const contentType = field(formData, "content_type");
  const { supabase, user } = await requireUser(`/propositions/nouvelle?type=${encodeURIComponent(contentType)}`);

  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && key !== "next" && !key.startsWith("$ACTION")) {
      values[key] = value;
    }
  }

  const result = validateProposal(contentType, formData);
  if (!result.ok) {
    return { errors: result.errors, values };
  }

  const { data, error } = await supabase
    .from("content_proposals")
    .insert({ author_id: user.id, content_type: contentType, title: result.title, payload: result.payload })
    .select("id")
    .single();

  if (error || !data) {
    logFailure("createProposal", error ?? {});
    return { errors: { _form: "Ta proposition n'a pas pu être enregistrée. Réessaie plus tard." }, values };
  }

  revalidatePath("/propositions");
  redirect(`/propositions?open=${data.id}`);
}

export async function castVote(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const next = returnPath(formData);
  const { supabase, user } = await requireUser(next);

  const proposalId = field(formData, "proposal_id");
  const clicked = field(formData, "vote");
  if (!isUuid(proposalId) || (clicked !== "up" && clicked !== "down")) {
    return { error: "Vote invalide." };
  }

  // Le vote actuel est relu côté serveur : on ne se fie pas à l'état affiché.
  const { data: existing, error: readError } = await supabase
    .from("proposal_votes")
    .select("vote")
    .eq("proposal_id", proposalId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (readError) {
    logFailure("castVote/lecture", readError);
    return { error: GENERIC_ERROR };
  }

  const current = existing?.vote === "up" || existing?.vote === "down" ? existing.vote : null;
  const target = nextVote(current, clicked);

  let failure: { code?: string; message?: string } | null = null;
  if (target === null) {
    ({ error: failure } = await supabase
      .from("proposal_votes")
      .delete()
      .eq("proposal_id", proposalId)
      .eq("user_id", user.id));
  } else if (current === null) {
    ({ error: failure } = await supabase
      .from("proposal_votes")
      .insert({ proposal_id: proposalId, user_id: user.id, vote: target }));
  } else {
    ({ error: failure } = await supabase
      .from("proposal_votes")
      .update({ vote: target })
      .eq("proposal_id", proposalId)
      .eq("user_id", user.id));
  }

  if (failure) {
    logFailure("castVote", failure);
    return {
      error:
        failure.code === "42501"
          ? "Vote refusé : la proposition est déjà traitée ou tu en es l'auteur."
          : GENERIC_ERROR,
    };
  }

  revalidatePath("/propositions");
  return { ok: true };
}

export async function addComment(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const next = returnPath(formData);
  const { supabase, user } = await requireUser(next);

  const proposalId = field(formData, "proposal_id");
  const rawBody = field(formData, "body");
  if (!isUuid(proposalId)) {
    return { error: "Proposition introuvable.", body: rawBody };
  }
  const body = validateComment(rawBody);
  if (!body.ok) {
    return { error: body.error, body: rawBody };
  }

  const { error } = await supabase
    .from("proposal_comments")
    .insert({ proposal_id: proposalId, author_id: user.id, body: body.value });
  if (error) {
    logFailure("addComment", error);
    return { error: "Ton commentaire n'a pas pu être publié. Réessaie plus tard.", body: rawBody };
  }

  revalidatePath("/propositions");
  return { ok: true };
}

export async function deleteComment(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireUser(returnPath(formData));

  const commentId = field(formData, "comment_id");
  if (!isUuid(commentId)) {
    return { error: "Commentaire introuvable." };
  }

  // `.select()` permet de distinguer « supprimé » de « refusé par la RLS » (0 ligne).
  const { data, error } = await supabase.from("proposal_comments").delete().eq("id", commentId).select("id");
  if (error) {
    logFailure("deleteComment", error);
    return { error: GENERIC_ERROR };
  }
  if (!data || data.length === 0) {
    return { error: "Suppression impossible : ce commentaire n'existe plus ou n'est pas à toi." };
  }

  revalidatePath("/propositions");
  return { ok: true };
}

export async function deleteProposal(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const next = returnPath(formData);
  const { supabase } = await requireUser(next);

  const proposalId = field(formData, "proposal_id");
  if (!isUuid(proposalId)) {
    return { error: "Proposition introuvable." };
  }

  const { data, error } = await supabase.from("content_proposals").delete().eq("id", proposalId).select("id");
  if (error) {
    logFailure("deleteProposal", error);
    return { error: GENERIC_ERROR };
  }
  if (!data || data.length === 0) {
    return { error: "Retrait impossible : la proposition a déjà été traitée ou n'est pas à toi." };
  }

  revalidatePath("/propositions");
  // `next` = liste sans `?open=` (filtres conservés).
  redirect(next.split("?")[0] === "/propositions" ? next : "/propositions");
}

export async function reviewProposal(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireUser(returnPath(formData));

  const proposalId = field(formData, "proposal_id");
  const decision = field(formData, "decision");
  if (!isUuid(proposalId) || (decision !== "approved" && decision !== "rejected")) {
    return { error: "Décision invalide." };
  }

  let reason: string | null = null;
  if (decision === "rejected") {
    const parsed = validateReason(formData.get("reason"));
    if (!parsed.ok) {
      return { error: parsed.error };
    }
    reason = parsed.value === "" ? null : parsed.value;
  }

  // Seule une proposition en attente peut être tranchée ; la RLS n'autorise que l'admin
  // (0 ligne modifiée pour tout autre compte).
  const { data, error } = await supabase
    .from("content_proposals")
    .update({ status: decision, rejection_reason: reason })
    .eq("id", proposalId)
    .eq("status", "pending")
    .select("id");
  if (error) {
    logFailure("reviewProposal", error);
    return { error: GENERIC_ERROR };
  }
  if (!data || data.length === 0) {
    return { error: "Décision impossible : réservé à l'administrateur, ou proposition déjà traitée." };
  }

  revalidatePath("/propositions");
  return { ok: true };
}
