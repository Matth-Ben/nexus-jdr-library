/**
 * Types d'options de classe (`class_options.option_type`), dans l'ordre
 * d'affichage de la page « Options de classe ».
 */
export const CLASS_OPTION_TYPES = [
  { code: "manoeuvre", label: "Manœuvres" },
  { code: "style_combat", label: "Styles de combat" },
  { code: "tir_arcanique", label: "Tirs arcaniques" },
  { code: "rune", label: "Runes" },
  { code: "metamagie", label: "Métamagie" },
  { code: "pacte", label: "Faveurs de pacte" },
  { code: "discipline_elementaire", label: "Disciplines élémentaires" },
  { code: "infusion", label: "Infusions" },
] as const;

export function isClassOptionType(code: string | null | undefined): boolean {
  return CLASS_OPTION_TYPES.some((type) => type.code === code);
}

/** Libellé FR d'un type d'option (repli : code humanisé). */
export function formatClassOptionType(code: string): string {
  return CLASS_OPTION_TYPES.find((type) => type.code === code)?.label ?? code.replace(/_/g, " ");
}

/** Rang d'affichage d'un type (les types inconnus passent en dernier). */
export function classOptionTypeOrder(code: string): number {
  const index = CLASS_OPTION_TYPES.findIndex((type) => type.code === code);
  return index === -1 ? CLASS_OPTION_TYPES.length : index;
}
