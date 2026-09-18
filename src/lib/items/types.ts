/**
 * Formes des lignes brutes renvoyées par Supabase, avant fusion avec les
 * traductions — voir `docs/cahier-des-charges/02-modele-donnees.md` et le
 * schéma réel de `20260825090300_create_reference_spells_items_tables.sql`
 * (dépôt web `markdown-editor`). Pas de colonne `name`/`description` sur
 * `items` : elles vivent dans la table générique `translations`
 * (`entity_type='item'`), exactement comme pour `spells`.
 */

/** Catégories réelles de `items.category` (contrainte CHECK en base). */
export type ItemCategory =
  | "arme"
  | "armure"
  | "bouclier"
  | "outil"
  | "equipement_general"
  | "objet_magique"
  | "monture_vehicule";

/** Forme réelle de la colonne `items.cost` (jsonb, nullable). */
export interface ItemCost {
  amount: number;
  currency: string;
}

export interface ItemRow {
  id: number;
  category: string;
  /** Nullable en base (`weight numeric`, pas de `not null`). */
  weight: number | null;
  /** Nullable en base (`cost jsonb`, pas de `not null`). */
  cost: ItemCost | null;
  /** Nullable en base (`source text`). */
  source: string | null;
  /**
   * Nullable en base (`rarity text`) — aucun `objet_magique` n'existe encore
   * en base au moment d'écrire ce code, donc cette colonne est vide en
   * pratique partout aujourd'hui. Gère le cas sans t'attendre à la voir
   * remplie tout de suite (même leçon que `spells.school` côté sorts).
   */
  rarity: string | null;
  requires_attunement: boolean;
  consumable: boolean;
}

/** Ligne `translations` (name ou description selon la requête). */
export interface TranslationRow {
  entity_id: string;
  value: string;
}

/** Forme réelle de la table `weapon_properties` (1-1 avec `items`). */
export interface WeaponPropertiesRow {
  item_id: number;
  damage_dice: string | null;
  damage_type: string | null;
  /** Liste de strings (codes de propriété d'arme, ex. "finesse", "leger"). */
  properties: string[];
  /** Nullable — portée en mètres, uniquement pour une arme à distance. */
  range: ItemRange | null;
}

/** Forme réelle de la colonne `weapon_properties.range` (jsonb, nullable). */
export interface ItemRange {
  normal: number;
  max: number;
}

/** Forme réelle de la table `armor_properties` (1-1 avec `items`). */
export interface ArmorPropertiesRow {
  item_id: number;
  ac_base: number;
  ac_dex_bonus: string;
  strength_requirement: number | null;
  stealth_disadvantage: boolean;
}

/** Objet tel qu'affiché dans la liste `/objets`. */
export interface ItemListItem {
  id: number;
  name: string;
  category: string;
  cost: ItemCost | null;
  weight: number | null;
}

/** Fiche complète d'un objet, `/objets/[id]`. */
export interface ItemDetail extends ItemListItem {
  description: string;
  source: string | null;
  rarity: string | null;
  requiresAttunement: boolean;
  consumable: boolean;
  weaponProperties: WeaponPropertiesRow | null;
  armorProperties: ArmorPropertiesRow | null;
}

/** Filtres pilotés par les paramètres d'URL de `/objets`. */
export interface ItemFilters {
  query?: string;
  category?: string;
}
