import type { ProposalType } from "./types";

/**
 * Cible d'une proposition de modification : identifiant (entier > 0) de la
 * ligne de référence visée (`spells`, `feats`, `items`, `races` ou `classes`
 * selon le type). `null` = proposition d'un nouveau contenu.
 */

/** Plus grand `integer` Postgres : au-delà, la colonne `target_id` refuserait la valeur. */
const MAX_TARGET_ID = 2_147_483_647;

/** Entier strictement positif écrit en chiffres (`12`), sinon `null` : jamais `1e3`, `0x1`, `+5`, `007`, `1.0`. */
export function parseTargetId(raw: unknown): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0 && value <= MAX_TARGET_ID ? value : null;
  }
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!/^[1-9][0-9]{0,9}$/.test(text)) return null;
  const id = Number(text);
  return id <= MAX_TARGET_ID ? id : null;
}

/** Page de la bibliothèque où s'ouvre l'élément (`?open=`). */
export const LIBRARY_PATHS: Record<ProposalType, string> = {
  spell: "/sorts",
  feat: "/dons",
  item: "/objets",
  race: "/races",
  class: "/classes",
};

export function libraryHref(type: ProposalType, id: number): string {
  return `${LIBRARY_PATHS[type]}?open=${id}`;
}

/** Formulaire de proposition de modification de l'élément `id`. */
export function modificationHref(type: ProposalType, id: number): string {
  return `/propositions/nouvelle?type=${type}&cible=${id}`;
}
