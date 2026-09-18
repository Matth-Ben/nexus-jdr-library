import type {
  ArmorPropertiesRow,
  ItemCategory,
  ItemCost,
  ItemDetail,
  ItemListItem,
  ItemRange,
  ItemRow,
  TranslationRow,
  WeaponPropertiesRow,
} from "./types";

/** Valeur affichée quand une traduction attendue est absente en base. */
const MISSING_NAME = "(nom manquant)";
const MISSING_TEXT = "(non renseigné)";

/** Libellés français des catégories d'objets — réutilisés tels quels depuis l'app mobile. */
const CATEGORY_LABELS: Record<ItemCategory, string> = {
  arme: "Arme",
  armure: "Armure",
  bouclier: "Bouclier",
  outil: "Outil",
  equipement_general: "Équipement général",
  objet_magique: "Objet magique",
  monture_vehicule: "Monture/Véhicule",
};

/** Libellés français du bonus de Dex à la CA d'une armure. */
const AC_DEX_BONUS_LABELS: Record<string, string> = {
  aucun: "Aucun",
  max_2: "+2 max",
  illimite: "Illimité",
};

function isItemCategory(value: string): value is ItemCategory {
  return Object.hasOwn(CATEGORY_LABELS, value);
}

/** Formate une catégorie d'objet en libellé FR, avec repli sur la valeur brute si non reconnue. */
export function formatCategory(category: string): string {
  return isItemCategory(category) ? CATEGORY_LABELS[category] : category;
}

/** Formate `armor_properties.ac_dex_bonus` en libellé FR, avec repli sur la valeur brute si non reconnue. */
export function formatAcDexBonus(acDexBonus: string): string {
  return AC_DEX_BONUS_LABELS[acDexBonus] ?? acDexBonus;
}

/**
 * Formate `items.cost` (jsonb `{amount, currency}`, nullable) en texte
 * lisible ("50 po"). `amount`/`currency` peuvent être absents même quand
 * `cost` n'est pas `null` — traité comme non renseigné dans ce cas aussi.
 */
/**
 * Valeur en pièces de cuivre et libellé français de chaque code de devise.
 * La base stocke des codes anglais (`gp`, vérifié le 2026-09-18 : les 86
 * objets sont en `gp`, avec des montants fractionnaires comme 0.1 ou 0.5),
 * l'app mobile et les règles françaises parlent en po/pa/pc.
 */
const CURRENCIES: Record<string, { label: string; copper: number }> = {
  gp: { label: "po", copper: 100 },
  po: { label: "po", copper: 100 },
  sp: { label: "pa", copper: 10 },
  pa: { label: "pa", copper: 10 },
  cp: { label: "pc", copper: 1 },
  pc: { label: "pc", copper: 1 },
};

/**
 * Formate `items.cost` (jsonb `{amount, currency}`, nullable) en pièces
 * françaises, en choisissant la plus grande unité qui donne un entier :
 * `0.1 gp` → "1 pa", `0.5 gp` → "5 pa", `0.01 gp` → "1 pc", `50 gp` → "50 po".
 * Devise inconnue : montant et code affichés tels quels.
 */
export function formatCost(cost: ItemCost | null | undefined): string {
  if (!cost || cost.amount === undefined || cost.amount === null || !cost.currency) {
    return MISSING_TEXT;
  }
  const currency = CURRENCIES[cost.currency];
  if (!currency) {
    return `${cost.amount} ${cost.currency}`;
  }
  const copper = Math.round(cost.amount * currency.copper);
  if (copper > 0 && copper % 100 === 0) return `${copper / 100} po`;
  if (copper > 0 && copper % 10 === 0) return `${copper / 10} pa`;
  if (copper === 0) return `0 ${currency.label}`;
  return `${copper} pc`;
}

/**
 * Formate `weapon_properties.range` (jsonb `{normal, max}`, nullable, en
 * mètres) en texte lisible ("normal 6 m / max 18 m"), pour une arme à
 * distance. Absente pour une arme de mêlée sans portée à distance.
 */
export function formatRange(range: ItemRange | null | undefined): string {
  if (!range || range.normal === undefined || range.normal === null) {
    return MISSING_TEXT;
  }
  if (range.max === undefined || range.max === null || range.max === range.normal) {
    return `${range.normal} m`;
  }
  return `${range.normal} m / ${range.max} m`;
}

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
 * Fusionne les lignes `items` avec les noms résolus depuis `translations`
 * (`entity_type='item'`, `field_name='name'`, `locale='fr'`) — l'appariement
 * se fait par `entity_id === String(item.id)`, comme côté app mobile.
 */
export function mergeItemListItems(
  itemRows: readonly ItemRow[],
  nameRows: readonly TranslationRow[],
): ItemListItem[] {
  const names = buildTranslationMap(nameRows);
  return itemRows.map((row) => toItemListItem(row, names));
}

function toItemListItem(row: ItemRow, names: Map<string, string>): ItemListItem {
  return {
    id: row.id,
    name: names.get(String(row.id)) ?? MISSING_NAME,
    category: row.category,
    cost: row.cost ?? null,
    weight: row.weight ?? null,
  };
}

/**
 * Fusionne une ligne `items` unique avec son nom, sa description résolus
 * depuis `translations`, et ses éventuelles propriétés d'arme/armure, pour
 * la fiche de détail `/objets/[id]`.
 */
export function mergeItemDetail(
  row: ItemRow,
  nameRows: readonly TranslationRow[],
  descriptionRows: readonly TranslationRow[],
  weaponProperties: WeaponPropertiesRow | null,
  armorProperties: ArmorPropertiesRow | null,
): ItemDetail {
  const names = buildTranslationMap(nameRows);
  const descriptions = buildTranslationMap(descriptionRows);
  return {
    ...toItemListItem(row, names),
    description: descriptions.get(String(row.id)) ?? MISSING_TEXT,
    source: row.source ?? null,
    rarity: row.rarity ?? null,
    requiresAttunement: row.requires_attunement,
    consumable: row.consumable,
    weaponProperties,
    armorProperties,
  };
}
