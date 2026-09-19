/** Même règle que l'app mobile (`AuthValidators.minPasswordLength`) et le projet Supabase. */
export const MIN_PASSWORD_LENGTH = 6;

/** Message d'erreur si le nouveau mot de passe est refusé, `null` s'il est valide. */
export function validateNewPassword(password: string, confirmation: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`;
  }
  if (password !== confirmation) {
    return "Les deux mots de passe ne correspondent pas.";
  }
  return null;
}
