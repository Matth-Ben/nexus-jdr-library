/**
 * Formes des lignes brutes renvoyées par Supabase, avant fusion avec les
 * traductions — voir `docs/cahier-des-charges/02-modele-donnees.md` et le
 * pattern déjà en place côté dépôt mobile (table `spells` + table générique
 * `translations`, pas de colonne `name`/`description` directe sur `spells`).
 */
/**
 * Forme réelle de la colonne `spells.components` (jsonb, pas texte — voir
 * `20260825090300_create_reference_spells_items_tables.sql` du dépôt web).
 * Pas de champ pour le détail d'une composante matérielle spécifique (ex.
 * "une pincée de guano de chauve-souris") : ce texte, quand il existe, fait
 * partie de la description du sort, pas de cette colonne.
 */
export interface SpellComponents {
  verbal: boolean;
  somatic: boolean;
  material: boolean;
}

export interface SpellRow {
  id: number;
  level: number;
  /**
   * Nullable en base (`school text`, pas de `not null`) — au moins 3 sorts
   * placeholders (import XML, contenu non catalogué) l'ont réellement à
   * `null` en production, vérifié le 2026-09-18.
   */
  school: string | null;
  casting_time: string;
  range?: string | null;
  components?: SpellComponents | null;
  duration?: string | null;
  concentration: boolean;
}

/** Ligne `translations` (name ou description selon la requête). */
export interface TranslationRow {
  entity_id: string;
  value: string;
}

/** Sort tel qu'affiché dans la liste `/sorts`. */
export interface SpellListItem {
  id: number;
  name: string;
  level: number;
  school: string | null;
  castingTime: string;
  concentration: boolean;
}

/** Fiche complète d'un sort, `/sorts/[id]`. */
export interface SpellDetail extends SpellListItem {
  range: string;
  components: string;
  duration: string;
  description: string;
}

/** Filtres pilotés par les paramètres d'URL de `/sorts`. */
export interface SpellFilters {
  query?: string;
  level?: number;
  school?: string;
}
