import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | undefined;

/**
 * Client Supabase partagé côté serveur (lecture publique de la bibliothèque
 * de contenu, aucune session utilisateur à ce stade — voir
 * `docs/cahier-des-charges/01-architecture-technique.md`, Phase 1).
 *
 * Les identifiants viennent exclusivement des variables d'environnement
 * (`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`), jamais en
 * dur dans le code — même règle que les autres dépôts de l'écosystème
 * Nexus JDR.
 */
export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Configuration Supabase manquante : vérifie NEXT_PUBLIC_SUPABASE_URL " +
        "et NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local.",
    );
  }

  cachedClient = createClient(url, anonKey, {
    auth: {
      persistSession: false,
    },
  });
  return cachedClient;
}
