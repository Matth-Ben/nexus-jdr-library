/**
 * Structures de rendu d'un payload de proposition, et lecture défensive :
 * le payload n'est validé par aucune contrainte en base (jsonb libre, saisi
 * par des utilisateurs), donc rien ne doit supposer sa forme.
 */

export interface PayloadRow {
  label: string;
  value: string;
}

/** Élément d'une liste (trait, aptitude, sous-race, sous-classe). */
export interface PayloadItem {
  title: string;
  /** Précision courte à côté du titre : « Niveau 3 »… */
  note?: string;
  text?: string;
  /** Intertitre à afficher avant cet élément quand il change (ex. « Niveau 3 »). */
  group?: string;
  /** Lignes label/valeur propres à l'élément (sous-race : bonus de caractéristiques). */
  rows?: PayloadRow[];
  /** Sous-listes (sous-race : ses traits). */
  sections?: PayloadSection[];
}

export interface PayloadSection {
  title: string;
  items: PayloadItem[];
  /** Éléments repliés par défaut dans la vue (`<details>`). */
  collapsible?: boolean;
}

export interface RenderedPayload {
  rows: PayloadRow[];
  /** Texte long, affiché sous la grille. `null` si absent ou illisible. */
  description: string | null;
  /** Listes détaillées (traits, aptitudes…), affichées sous la description. */
  sections: PayloadSection[];
}

export const MISSING_TEXT = "(non renseigné)";

/** Plafond d'éléments rendus par liste : un payload malformé ne doit pas geler la page. */
export const MAX_RENDERED_ITEMS = 100;

export function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value.slice(0, MAX_RENDERED_ITEMS) : [];
}

export function asStringArray(value: unknown): string[] {
  return asArray(value)
    .map(asText)
    .filter((text): text is string => text !== null);
}

export function asInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}
