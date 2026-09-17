import type { SpellDetail, SpellListItem, SpellRow, TranslationRow } from "./types";

/** Valeur affichée quand une traduction attendue est absente en base. */
const MISSING_NAME = "(nom manquant)";
const MISSING_TEXT = "(non renseigné)";

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
 * Fusionne les lignes `spells` avec les noms résolus depuis `translations`
 * (`entity_type='spell'`, `field_name='name'`, `locale='fr'`) — l'appariement
 * se fait par `entity_id === String(spell.id)`, comme côté app mobile.
 */
export function mergeSpellListItems(
  spellRows: readonly SpellRow[],
  nameRows: readonly TranslationRow[],
): SpellListItem[] {
  const names = buildTranslationMap(nameRows);
  return spellRows.map((row) => toSpellListItem(row, names));
}

function toSpellListItem(
  row: SpellRow,
  names: Map<string, string>,
): SpellListItem {
  return {
    id: row.id,
    name: names.get(String(row.id)) ?? MISSING_NAME,
    level: row.level,
    school: row.school,
    castingTime: row.casting_time,
    concentration: row.concentration,
  };
}

/**
 * Fusionne une ligne `spells` unique avec son nom et sa description résolus
 * depuis `translations`, pour la fiche de détail `/sorts/[id]`.
 */
export function mergeSpellDetail(
  row: SpellRow,
  nameRows: readonly TranslationRow[],
  descriptionRows: readonly TranslationRow[],
): SpellDetail {
  const names = buildTranslationMap(nameRows);
  const descriptions = buildTranslationMap(descriptionRows);
  return {
    ...toSpellListItem(row, names),
    range: row.range ?? MISSING_TEXT,
    components: row.components ?? MISSING_TEXT,
    duration: row.duration ?? MISSING_TEXT,
    description: descriptions.get(String(row.id)) ?? MISSING_TEXT,
  };
}
