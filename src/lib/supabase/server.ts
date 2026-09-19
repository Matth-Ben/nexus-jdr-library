import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Client Supabase lié à la session de l'utilisateur (cookies) — pour l'auth.
 * La lecture publique du contenu reste sur `getSupabaseClient()` (anonyme).
 */
export async function createSessionClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Configuration Supabase manquante : vérifie NEXT_PUBLIC_SUPABASE_URL " +
        "et NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local.",
    );
  }

  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Appelé depuis un Server Component (cookies en lecture seule) :
          // sans effet, le proxy rafraîchit déjà la session à chaque requête.
        }
      },
    },
  });
}
