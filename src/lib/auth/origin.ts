import { headers } from "next/headers";

/**
 * URL publique du site, utilisée pour l'adresse de retour des e-mails de
 * réinitialisation. `NEXT_PUBLIC_SITE_URL` (à définir en production) prime ;
 * sans elle, on la déduit de la requête (développement local).
 */
export async function getSiteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}
