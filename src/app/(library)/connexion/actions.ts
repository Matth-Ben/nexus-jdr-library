"use server";

import { redirect } from "next/navigation";
import { getSiteOrigin } from "@/lib/auth/origin";
import { validateNewPassword } from "@/lib/auth/password";
import { safeNextPath } from "@/lib/auth/redirect";
import { createSessionClient } from "@/lib/supabase/server";

export interface LoginState {
  error?: string;
}

export interface ResetRequestState {
  error?: string;
  sent?: boolean;
}

export interface UpdatePasswordState {
  error?: string;
  done?: boolean;
}

export async function signIn(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(formData.get("next"));

  if (!email || !password) {
    return { error: "Renseigne ton e-mail et ton mot de passe." };
  }

  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Message volontairement générique : ne révèle pas si le compte existe.
    const isRefused = error.status === 400 || error.status === 401;
    if (!isRefused) {
      console.error("[connexion] échec inattendu de l'authentification", error.status, error.code);
    }
    return {
      error: isRefused
        ? "E-mail ou mot de passe incorrect."
        : "Connexion impossible pour le moment. Réessaie plus tard.",
    };
  }

  redirect(next);
}

export async function signOut(): Promise<void> {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect("/");
}

/**
 * Envoie l'e-mail de réinitialisation. La réponse est la même que le compte
 * existe ou non (Supabase ne signale pas les adresses inconnues), pour ne pas
 * permettre de deviner quelles adresses ont un compte.
 */
export async function requestPasswordReset(
  _previous: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "Renseigne ton adresse e-mail." };
  }

  const supabase = await createSessionClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await getSiteOrigin()}/auth/callback`,
  });

  if (error) {
    if (error.status === 429) {
      return { error: "Trop de demandes. Réessaie dans quelques minutes." };
    }
    console.error("[mot-de-passe-oublie] échec de l'envoi", error.status, error.code);
    return { error: "Envoi impossible pour le moment. Réessaie plus tard." };
  }

  return { sent: true };
}

export async function updatePassword(
  _previous: UpdatePasswordState,
  formData: FormData,
): Promise<UpdatePasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  const invalid = validateNewPassword(password, confirmation);
  if (invalid) {
    return { error: invalid };
  }

  const supabase = await createSessionClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    if (error.code === "same_password") {
      return { error: "Choisis un mot de passe différent de l'ancien." };
    }
    if (error.code === "weak_password") {
      return { error: "Ce mot de passe est trop faible." };
    }
    if (error.status === 401 || error.code === "session_not_found") {
      return { error: "Le lien a expiré. Demande un nouvel e-mail de réinitialisation." };
    }
    console.error("[reinitialisation] échec de la mise à jour", error.status, error.code);
    return { error: "Mise à jour impossible pour le moment. Réessaie plus tard." };
  }

  return { done: true };
}
