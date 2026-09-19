/**
 * Chemin de retour après connexion, uniquement interne : "/…" mais ni "//…"
 * (URL relative au protocole) ni "/\…", pour éviter une redirection ouverte.
 * Repli sur l'accueil.
 */
export function safeNextPath(raw: FormDataEntryValue | string | string[] | null | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string") {
    return "/";
  }
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/";
  }
  for (const char of value) {
    if (char.charCodeAt(0) < 32) {
      return "/";
    }
  }
  return value;
}
