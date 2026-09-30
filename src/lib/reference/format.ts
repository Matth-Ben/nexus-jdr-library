import type { Ref } from "./types";

/** Valeur affichée quand une traduction attendue est absente en base. */
export const MISSING_NAME = "(nom manquant)";
export const MISSING_TEXT = "(non renseigné)";

/** Construit une référence `{id, name}` à partir d'une table de traductions. */
export function toRef(id: number, names: Map<string, string>): Ref {
  return { id, name: names.get(String(id)) ?? MISSING_NAME };
}

/** Référence optionnelle : `null` si l'identifiant est absent. */
export function toOptionalRef(id: number | null | undefined, names: Map<string, string>): Ref | null {
  return id == null ? null : toRef(id, names);
}

/** Tri alphabétique français par nom (copie, ne modifie pas l'entrée). */
export function sortByName<T extends { name: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

const LINEAGE_GROUP_LABELS: Record<string, string> = {
  phb_ancestry: "Ascendance draconique",
  fizban_metallic: "Dragons métalliques (Fizban)",
  "2024_lineage": "Lignée (règles 2024)",
  genasi_elemental_type: "Héritage élémentaire",
};

/** Libellé FR de `race_lineages.lineage_group` (repli : code humanisé). */
export function lineageGroupLabel(code: string | null): string | null {
  if (!code) {
    return null;
  }
  return LINEAGE_GROUP_LABELS[code] ?? code.replace(/_/g, " ");
}

const PACT_LABELS: Record<string, string> = {
  chaine: "Pacte de la chaîne",
  grimoire: "Pacte du grimoire",
  lame: "Pacte de la lame",
  talisman: "Pacte du talisman",
};

/** Libellé FR du pacte requis par une invocation (`prerequisites.pact`). */
export function pactLabel(code: string | null | undefined): string | null {
  if (!code) {
    return null;
  }
  return PACT_LABELS[code] ?? code.replace(/_/g, " ");
}

const GRANT_KIND_LABELS: Record<string, string> = {
  always_prepared: "Toujours préparé",
  extends_list: "Ajouté à la liste de sorts",
};

/** Libellé FR de `subclass_spells.grant_kind`. */
export function grantKindLabel(code: string): string {
  return GRANT_KIND_LABELS[code] ?? code.replace(/_/g, " ");
}

/**
 * Libellé des prérequis d'une invocation : le texte rédigé en base s'il
 * existe, sinon reconstruit à partir du niveau et du pacte.
 */
export function invocationPrerequisiteText(
  prerequisites: { text?: string; level?: number; pact?: string } | null,
): string | null {
  if (!prerequisites) {
    return null;
  }
  if (prerequisites.text && prerequisites.text.trim() !== "") {
    return prerequisites.text.trim();
  }
  const parts: string[] = [];
  if (typeof prerequisites.level === "number") {
    parts.push(`Niveau ${prerequisites.level}`);
  }
  const pact = pactLabel(prerequisites.pact);
  if (pact) {
    parts.push(pact);
  }
  return parts.length > 0 ? parts.join(", ") : null;
}
