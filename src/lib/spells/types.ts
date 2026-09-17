/**
 * Formes des lignes brutes renvoyées par Supabase, avant fusion avec les
 * traductions — voir `docs/cahier-des-charges/02-modele-donnees.md` et le
 * pattern déjà en place côté dépôt mobile (table `spells` + table générique
 * `translations`, pas de colonne `name`/`description` directe sur `spells`).
 */
export interface SpellRow {
  id: number;
  level: number;
  school: string;
  casting_time: string;
  range?: string | null;
  components?: string | null;
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
  school: string;
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
