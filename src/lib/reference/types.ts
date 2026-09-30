/**
 * Types des pages dédiées du référentiel : sous-races, sous-classes,
 * aptitudes de classe, options de classe, invocations occultes et lignées.
 * Comme pour `/sorts` ou `/classes`, aucune table n'a de colonne `name` :
 * les textes FR vivent dans `public.translations`.
 */
import type { AbilityBonuses, Trait } from "@/lib/races/types";

/** Référence minimale vers un autre élément, pour afficher un lien. */
export interface Ref {
  id: number;
  name: string;
}

// ---------------------------------------------------------------------------
// Lignes brutes Supabase
// ---------------------------------------------------------------------------

export interface SubraceRow {
  id: number;
  race_id: number;
  ability_bonuses: AbilityBonuses;
  traits: Trait[];
}

export interface SubclassRow {
  id: number;
  class_id: number;
  available_from_level: number;
}

export interface ClassFeatureRow {
  id: number;
  class_id: number | null;
  subclass_id: number | null;
  level: number;
  choice_type: string | null;
  uses_per_rest: unknown | null;
}

/**
 * `invocations.prerequisites` (jsonb), clés vérifiées en base le 2026-09-29 :
 * `text` (libellé déjà rédigé), `level` (niveau d'occultiste), `pact`
 * (`chaine` | `grimoire` | `lame` | `talisman`), `cantrip_spell_id`.
 */
export interface InvocationPrerequisites {
  text?: string;
  level?: number;
  pact?: string;
  cantrip_spell_id?: number;
}

export interface InvocationRow {
  id: number;
  prerequisites: InvocationPrerequisites | null;
}

export interface RaceLineageRow {
  id: number;
  race_id: number | null;
  subrace_id: number | null;
  lineage_group: string | null;
  grants_ability_bonus: boolean | null;
  ability_bonuses: AbilityBonuses | null;
  damage_type: string | null;
  resistance_damage_type: string | null;
  source_book: string | null;
}

export interface RacialInnateSpellRow {
  id: number;
  race_id: number | null;
  subrace_id: number | null;
  lineage_id: number | null;
  spell_id: number | null;
  character_level: number | null;
}

export interface SubclassSpellRow {
  subclass_id: number;
  spell_id: number;
  class_level: number;
  grant_kind: string;
}

// ---------------------------------------------------------------------------
// Éléments affichés
// ---------------------------------------------------------------------------

/** Sort accordé à un niveau donné (sort inné racial, sort de sous-classe). */
export interface GrantedSpell {
  spell: Ref;
  level: number | null;
  /** Précision éventuelle ("Toujours préparé", "Ajouté à la liste de sorts"). */
  note: string | null;
}

export interface SubraceListItem extends Ref {
  race: Ref;
  abilityBonuses: string;
}

export interface SubraceDetail extends SubraceListItem {
  traits: Trait[];
  lineages: Ref[];
  innateSpells: GrantedSpell[];
}

export interface SubclassListItem extends Ref {
  class: Ref;
  availableFromLevel: number;
}

export interface FeatureSummary extends Ref {
  level: number;
}

export interface SubclassDetail extends SubclassListItem {
  description: string;
  features: FeatureSummary[];
  spells: GrantedSpell[];
}

export interface FeatureListItem extends Ref {
  level: number;
  /** Classe propriétaire — pour une aptitude de sous-classe, la classe de celle-ci. */
  class: Ref | null;
  subclass: Ref | null;
  /** Code brut `class_features.choice_type` (`pacte`, `metamagie`...). */
  choiceCode: string | null;
  /** Libellé FR du type de choix. */
  choiceLabel: string | null;
}

export interface FeatureDetail extends FeatureListItem {
  description: string;
  usesPerRestLabel: string | null;
  /** Invocations liées (aptitude « Invocations occultes » ou « Faveur de pacte »). */
  invocations: Ref[];
  /** Options de classe du même type (manœuvres, métamagie, styles de combat...). */
  classOptions: Ref[];
}

export interface InvocationListItem extends Ref {
  prerequisiteText: string | null;
  level: number | null;
}

export interface InvocationDetail extends InvocationListItem {
  description: string;
  pactLabel: string | null;
  /** Aptitude « Faveur de pacte » à consulter quand un pacte est requis. */
  pactFeature: Ref | null;
  cantrip: Ref | null;
  /** Aptitude(s) qui donnent accès aux invocations, avec leur classe. */
  grantedBy: { feature: Ref; class: Ref | null }[];
}

export interface LineageListItem extends Ref {
  race: Ref | null;
  subrace: Ref | null;
  groupLabel: string | null;
  source: string | null;
}

export interface LineageDetail extends LineageListItem {
  effect: string | null;
  damageType: string | null;
  resistance: string | null;
  abilityBonuses: string | null;
  innateSpells: GrantedSpell[];
}
