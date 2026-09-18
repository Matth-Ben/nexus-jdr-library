import type {
  AbilityBonuses,
  RaceDetail,
  RaceListItem,
  RaceRow,
  SubraceDetail,
  SubraceRow,
  TranslationRow,
} from "./types";

/** Valeur affichée quand une traduction attendue est absente en base. */
const MISSING_NAME = "(nom manquant)";
const MISSING_TEXT = "(non renseigné)";

/**
 * Abréviations françaises conventionnelles des caractéristiques D&D 5e,
 * dans l'ordre où elles sont habituellement listées dans les règles.
 */
const ABILITY_ORDER = ["str", "dex", "con", "int", "wis", "cha", "choice_others"] as const;

const ABILITY_LABELS: Record<string, string> = {
  str: "FOR",
  dex: "DEX",
  con: "CON",
  int: "INT",
  wis: "SAG",
  cha: "CHA",
};

function formatAbilityEntry(key: string, value: number): string {
  const sign = value >= 0 ? "+" : "";
  if (key === "choice_others") {
    return `${sign}${value} au choix`;
  }
  const label = ABILITY_LABELS[key] ?? key.toUpperCase();
  return `${label} ${sign}${value}`;
}

/**
 * Formate `races.ability_bonuses`/`subraces.ability_bonuses` (jsonb, ex.
 * `{"dex": 2}`) en libellé lisible ("DEX +2"), plusieurs bonus étant séparés
 * par une virgule. La clé spéciale `choice_others` (bonus au choix du
 * joueur) est affichée telle quelle sans logique de choix complexe.
 */
export function formatAbilityBonuses(bonuses: AbilityBonuses | null | undefined): string {
  if (!bonuses || Object.keys(bonuses).length === 0) {
    return MISSING_TEXT;
  }

  const knownKeys = new Set<string>(ABILITY_ORDER);
  const orderedEntries = ABILITY_ORDER.filter((key) => key in bonuses).map((key) =>
    formatAbilityEntry(key, bonuses[key]),
  );
  const extraEntries = Object.keys(bonuses)
    .filter((key) => !knownKeys.has(key))
    .map((key) => formatAbilityEntry(key, bonuses[key]));

  const entries = [...orderedEntries, ...extraEntries];
  return entries.length > 0 ? entries.join(", ") : MISSING_TEXT;
}

/**
 * Indexe des lignes `translations` par `entity_id` — fonction pure, aucune
 * dépendance réseau, réutilisée pour les races comme pour les sous-races
 * (même table, seul `entity_type` change dans la requête qui produit `rows`).
 */
export function buildTranslationMap(rows: readonly TranslationRow[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    map.set(row.entity_id, row.value);
  }
  return map;
}

function toRaceListItem(row: RaceRow, names: Map<string, string>): RaceListItem {
  return {
    id: row.id,
    name: names.get(String(row.id)) ?? MISSING_NAME,
    size: row.size,
    speed: row.speed,
    source: row.source,
  };
}

/**
 * Fusionne les lignes `races` avec les noms résolus depuis `translations`
 * (`entity_type='race'`, `field_name='name'`, `locale='fr'`) — l'appariement
 * se fait par `entity_id === String(race.id)`, comme côté app mobile.
 */
export function mergeRaceListItems(
  raceRows: readonly RaceRow[],
  nameRows: readonly TranslationRow[],
): RaceListItem[] {
  const names = buildTranslationMap(nameRows);
  return raceRows.map((row) => toRaceListItem(row, names));
}

function toSubraceDetail(row: SubraceRow, names: Map<string, string>): SubraceDetail {
  return {
    id: row.id,
    name: names.get(String(row.id)) ?? MISSING_NAME,
    abilityBonuses: formatAbilityBonuses(row.ability_bonuses),
    traits: row.traits ?? [],
  };
}

/**
 * Fusionne une ligne `races` unique, ses sous-races (`subraces.race_id`) et
 * les traductions résolues pour l'une et les autres, pour la fiche de
 * détail `/races/[id]`. Pas de traduction `description` pour une race : sa
 * description narrative vit dans ses `traits`, déjà nommés/décrits en base.
 */
export function mergeRaceDetail(
  row: RaceRow,
  subraceRows: readonly SubraceRow[],
  raceNameRows: readonly TranslationRow[],
  subraceNameRows: readonly TranslationRow[],
): RaceDetail {
  const raceNames = buildTranslationMap(raceNameRows);
  const subraceNames = buildTranslationMap(subraceNameRows);

  return {
    ...toRaceListItem(row, raceNames),
    abilityBonuses: formatAbilityBonuses(row.ability_bonuses),
    languages: row.languages ?? [],
    traits: row.traits ?? [],
    subraces: subraceRows.map((subrace) => toSubraceDetail(subrace, subraceNames)),
  };
}
