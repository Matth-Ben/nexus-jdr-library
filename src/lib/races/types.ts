/**
 * Formes des lignes brutes renvoyées par Supabase, avant fusion avec les
 * traductions — voir `docs/cahier-des-charges/02-modele-donnees.md` et le
 * pattern déjà en place côté `src/lib/spells/` (table `races`/`subraces` +
 * table générique `translations`, pas de colonne `name` directe).
 *
 * Schéma réel vérifié dans
 * `markdown-editor/supabase/migrations/20260825090200_create_reference_races_classes_tables.sql` :
 * `races.source`/`size`/`speed` sont nullable (pas de `not null` en base),
 * contrairement à `ability_bonuses`/`traits`/`languages` qui ont un défaut
 * jsonb `not null` mais peuvent malgré tout être des tableaux/objets vides.
 */

/**
 * Forme réelle de `races.ability_bonuses`/`subraces.ability_bonuses` (jsonb,
 * ex. `{"dex": 2}`). Une race peut porter une clé spéciale `choice_others`
 * pour un bonus au choix du joueur plutôt qu'une caractéristique fixe.
 */
export type AbilityBonuses = Record<string, number>;

/** Élément de `races.traits`/`subraces.traits` (jsonb, liste d'objets). */
export interface Trait {
  name: string;
  description: string;
}

export interface RaceRow {
  id: number;
  /** Nullable en base (`source text`, pas de `not null`). */
  source: string | null;
  /** Nullable en base (`size text`, pas de `not null`). */
  size: string | null;
  /** Nullable en base (`speed int`, pas de `not null`). */
  speed: number | null;
  ability_bonuses: AbilityBonuses;
  traits: Trait[];
  languages: string[];
}

export interface SubraceRow {
  id: number;
  race_id: number;
  ability_bonuses: AbilityBonuses;
  traits: Trait[];
}

/** Ligne `translations` (name uniquement pour races/subraces). */
export interface TranslationRow {
  entity_id: string;
  value: string;
}

/** Race telle qu'affichée dans la liste `/races`. */
export interface RaceListItem {
  id: number;
  name: string;
  size: string | null;
  speed: number | null;
  source: string | null;
}

/** Sous-race telle qu'affichée dans la fiche de détail d'une race. */
export interface SubraceDetail {
  id: number;
  name: string;
  abilityBonuses: string;
  traits: Trait[];
}

/** Fiche complète d'une race, `/races/[id]`. */
export interface RaceDetail extends RaceListItem {
  abilityBonuses: string;
  languages: string[];
  traits: Trait[];
  subraces: SubraceDetail[];
}

/** Filtres pilotés par les paramètres d'URL de `/races`. */
export interface RaceFilters {
  query?: string;
}
