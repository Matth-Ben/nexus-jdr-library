/**
 * Table `creatures` (bestiaire SRD 5.2) — voir la migration
 * `markdown-editor/supabase/migrations/20260930160000_create_creatures.sql`.
 * Le nom est dans `translations` (`entity_type = 'creature'`) ; les autres
 * textes (taille, type, blocs d'actions...) sont stockés directement en français.
 */

export type AbilityCode = "str" | "dex" | "con" | "int" | "wis" | "cha";

/** Vitesses en pieds (`walk`, `fly`...), `hover` indique le vol stationnaire. */
export interface CreatureSpeed {
  walk?: number;
  fly?: number;
  swim?: number;
  climb?: number;
  burrow?: number;
  hover?: boolean;
}

/** Trait, action, réaction... : `{ name, description }` en français. */
export interface CreatureBlock {
  name: string;
  description: string;
}

export interface CreatureListRow {
  id: number;
  size: string;
  creature_type: string;
  challenge_rating: number | string;
}

export interface CreatureRow extends CreatureListRow {
  alignment: string | null;
  armor_class: number;
  armor_detail: string | null;
  hit_points: number;
  hit_dice: string | null;
  speed: CreatureSpeed | null;
  ability_scores: Partial<Record<AbilityCode, number>> | null;
  saving_throws: Partial<Record<AbilityCode, number>> | null;
  skills: Record<string, number> | null;
  damage_vulnerabilities: string | null;
  damage_resistances: string | null;
  damage_immunities: string | null;
  condition_immunities: string | null;
  senses: string | null;
  languages: string | null;
  experience_points: number | null;
  proficiency_bonus: number | null;
  initiative_bonus: number | null;
  traits: CreatureBlock[] | null;
  actions: CreatureBlock[] | null;
  bonus_actions: CreatureBlock[] | null;
  reactions: CreatureBlock[] | null;
  legendary_actions: CreatureBlock[] | null;
  source: string | null;
}

/** Créature telle qu'affichée dans la liste `/creatures`. */
export interface CreatureListItem {
  id: number;
  name: string;
  size: string;
  type: string;
  /** Facteur de puissance numérique (0,125 pour 1/8), pour le tri et le filtre. */
  challenge: number;
}

export interface AbilityLine {
  code: AbilityCode;
  label: string;
  score: number;
  modifier: string;
  save: string;
}

/** Fiche complète d'une créature (panneau). */
export interface CreatureDetail extends CreatureListItem {
  alignment: string | null;
  armorClass: string;
  hitPoints: string;
  speed: string;
  initiative: string | null;
  abilities: AbilityLine[];
  skills: string | null;
  vulnerabilities: string | null;
  resistances: string | null;
  immunities: string | null;
  conditionImmunities: string | null;
  senses: string | null;
  languages: string | null;
  challengeLabel: string;
  traits: CreatureBlock[];
  actions: CreatureBlock[];
  bonusActions: CreatureBlock[];
  reactions: CreatureBlock[];
  legendaryActions: CreatureBlock[];
  source: string | null;
}
