/**
 * Formes des lignes brutes renvoyées par Supabase, avant fusion avec les
 * traductions — même pattern que `src/lib/spells/types.ts` (table `feats` +
 * table générique `translations`, pas de colonne `name`/`description`
 * directe sur `feats`), voir `docs/cahier-des-charges/02-modele-donnees.md`
 * et le schéma vérifié dans
 * `markdown-editor/supabase/migrations/20260825090200_create_reference_races_classes_tables.sql`.
 */

/**
 * Forme réelle de la colonne `feats.prerequisites` (jsonb, `not null default
 * '{}'`) — la clé `text` (prérequis lisible, ex. "Force 13 ou plus") peut
 * être absente ou `null` : dans ce cas le don n'a pas de prérequis. Ne
 * suppose aucune autre clé structurée, confirmé par le code Dart de l'app
 * mobile (`feats.prerequisites->>'text'`).
 */
export interface FeatPrerequisites {
  text?: string | null;
}

export interface FeatRow {
  id: number;
  prerequisites: FeatPrerequisites | null;
}

/** Ligne `translations` (name ou description selon la requête). */
export interface TranslationRow {
  entity_id: string;
  value: string;
}

/** Don tel qu'affiché dans la liste `/dons`. */
export interface FeatListItem {
  id: number;
  name: string;
  /** `null` quand le don n'a aucun prérequis. */
  prerequisiteText: string | null;
}

/** Fiche complète d'un don, `/dons/[id]`. */
export interface FeatDetail extends FeatListItem {
  description: string;
}

/** Filtres pilotés par les paramètres d'URL de `/dons`. */
export interface FeatFilters {
  query?: string;
}
