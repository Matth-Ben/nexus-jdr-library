import type { FeatDetail, FeatListItem, FeatRow, TranslationRow } from "./types";

/** Valeur affichée quand une traduction attendue est absente en base. */
const MISSING_NAME = "(nom manquant)";
const MISSING_TEXT = "(non renseigné)";

/**
 * Extrait le prérequis textuel lisible depuis `feats.prerequisites`
 * (`{"text": "..."}`) — `null` quand le don n'a aucun prérequis (clé absente,
 * `null`, ou chaîne vide après nettoyage).
 */
export function formatPrerequisiteText(
  prerequisites: FeatRow["prerequisites"],
): string | null {
  const text = prerequisites?.text?.trim();
  return text ? text : null;
}

/**
 * Indexe des lignes `translations` par `entity_id` — fonction pure, aucune
 * dépendance réseau, réutilisée pour les noms comme pour les descriptions
 * (même table, seul `field_name` change dans la requête qui produit `rows`).
 */
export function buildTranslationMap(
  rows: readonly TranslationRow[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    map.set(row.entity_id, row.value);
  }
  return map;
}

/**
 * Fusionne les lignes `feats` avec les noms résolus depuis `translations`
 * (`entity_type='feat'`, `field_name='name'`, `locale='fr'`) — l'appariement
 * se fait par `entity_id === String(feat.id)`, comme côté app mobile.
 */
export function mergeFeatListItems(
  featRows: readonly FeatRow[],
  nameRows: readonly TranslationRow[],
): FeatListItem[] {
  const names = buildTranslationMap(nameRows);
  return featRows.map((row) => toFeatListItem(row, names));
}

function toFeatListItem(
  row: FeatRow,
  names: Map<string, string>,
): FeatListItem {
  return {
    id: row.id,
    name: names.get(String(row.id)) ?? MISSING_NAME,
    prerequisiteText: formatPrerequisiteText(row.prerequisites),
  };
}

/**
 * Fusionne une ligne `feats` unique avec son nom et sa description résolus
 * depuis `translations`, pour la fiche de détail `/dons/[id]`.
 */
export function mergeFeatDetail(
  row: FeatRow,
  nameRows: readonly TranslationRow[],
  descriptionRows: readonly TranslationRow[],
): FeatDetail {
  const names = buildTranslationMap(nameRows);
  const descriptions = buildTranslationMap(descriptionRows);
  return {
    ...toFeatListItem(row, names),
    description: descriptions.get(String(row.id)) ?? MISSING_TEXT,
  };
}
