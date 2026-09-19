import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getSiteOrigin } from "@/lib/auth/origin";
import { createSessionClient } from "@/lib/supabase/server";

/**
 * Cible du lien de l'e-mail de réinitialisation : échange le code contre une
 * session, puis envoie vers le formulaire de nouveau mot de passe.
 */
export async function GET(request: NextRequest) {
  const origin = await getSiteOrigin();
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type");

  const supabase = await createSessionClient();
  let failed = true;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failed = error !== null;
  } else if (tokenHash && type === "recovery") {
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash: tokenHash,
    });
    failed = error !== null;
  }

  return NextResponse.redirect(
    new URL(failed ? "/mot-de-passe-oublie?erreur=lien" : "/reinitialisation", origin),
  );
}
