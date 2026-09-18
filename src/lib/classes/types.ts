/**
 * Formes des lignes brutes renvoyées par Supabase, avant fusion avec les
 * traductions — voir `docs/cahier-des-charges/02-modele-donnees.md` et le
 * schéma réel de `20260825090200_create_reference_races_classes_tables.sql`
 * (dépôt `markdown-editor`). Comme pour `spells`, aucune colonne
 * `name`/`description` directe : ce texte vit dans `public.translations`
 * (`entity_type` = `'class'` | `'subclass'` | `'class_feature'`).
 */

/**
 * Forme (supposée) de `classes.skill_choices` (jsonb, défaut `{}`) — non
 * vérifiée en base tant que la migration RLS de `classes` n'est pas
 * appliquée (voir le blocage RLS signalé au chef de projet). `count` et
 * `options` sont donc traités comme potentiellement absents plutôt que
 * garantis, même si le défaut `{}` ne devrait jamais être `null` lui-même.
 */
export interface ClassSkillChoices {
  count?: number;
  options?: string[];
}

export interface ClassRow {
  id: number;
  /** Nullable en base (`source text`, pas de `not null`). */
  source: string | null;
  hit_die: number;
  primary_abilities: string[];
  saving_throw_proficiencies: string[];
  armor_proficiencies: string[];
  weapon_proficiencies: string[];
  tool_proficiencies: string[];
  skill_choices: ClassSkillChoices;
}

export interface SubclassRow {
  id: number;
  class_id: number;
  available_from_level: number;
}

export interface ClassFeatureRow {
  id: number;
  /** Nullable — une aptitude appartient à une classe OU une sous-classe. */
  class_id: number | null;
  /** Nullable — voir `class_id`. */
  subclass_id: number | null;
  level: number;
  /** Nullable en base (`choice_type text`, pas de `not null`). */
  choice_type: string | null;
  /**
   * Nullable en base (`uses_per_rest jsonb`, pas de `default`, donc
   * réellement `null` possible contrairement aux autres colonnes jsonb de ce
   * schéma). Forme non documentée/vérifiée : traité comme opaque, formaté
   * défensivement plutôt que d'en supposer la structure.
   */
  uses_per_rest: unknown | null;
}

/** Ligne `translations` (name ou description selon la requête). */
export interface TranslationRow {
  entity_id: string;
  value: string;
}

/** Classe telle qu'affichée dans la liste `/classes`. */
export interface ClassListItem {
  id: number;
  name: string;
  hitDie: number;
  source: string | null;
}

/** Aptitude de classe telle qu'affichée dans la fiche détail d'une classe. */
export interface ClassFeatureDetail {
  id: number;
  name: string;
  description: string;
  level: number;
  choiceType: string | null;
  /** Résumé défensif de `uses_per_rest`, `null` si absent ou de forme inconnue. */
  usesPerRestLabel: string | null;
}

/** Sous-classe résumée dans la fiche détail d'une classe. */
export interface SubclassSummary {
  id: number;
  name: string;
  availableFromLevel: number;
}

/** Fiche complète d'une classe, `/classes/[id]`. */
export interface ClassDetail extends ClassListItem {
  description: string;
  primaryAbilities: string[];
  savingThrowProficiencies: string[];
  armorProficiencies: string[];
  weaponProficiencies: string[];
  toolProficiencies: string[];
  skillChoicesLabel: string;
  features: ClassFeatureDetail[];
  subclasses: SubclassSummary[];
}

/** Filtres pilotés par les paramètres d'URL de `/classes`. */
export interface ClassFilters {
  query?: string;
}
