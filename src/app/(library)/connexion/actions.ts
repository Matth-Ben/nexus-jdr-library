"use server";

import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/auth/redirect";
import { createSessionClient } from "@/lib/supabase/server";

export interface LoginState {
  error?: string;
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
