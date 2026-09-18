import { cache } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { mergeItemDetail, mergeItemListItems } from "./translations";
import type {
  ArmorPropertiesRow,
  ItemDetail,
  ItemListItem,
  ItemRow,
  TranslationRow,
  WeaponPropertiesRow,
} from "./types";

/** Colonnes `items` nécessaires à la liste (pas `source`/`rarity`/attunement/consumable, réservées au détail). */
const ITEM_LIST_COLUMNS = "id, category, weight, cost";
const ITEM_DETAIL_COLUMNS =
  "id, category, weight, cost, source, rarity, requires_attunement, consumable";

const LOCALE = "fr";

/** Erreur levée quand la requête Supabase échoue (réseau, RLS, etc.). */
export class ItemFetchError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ItemFetchError";
  }
}

async function fetchTranslationRows(
  entityIds: readonly string[],
  fieldName: "name" | "description",
): Promise<TranslationRow[]> {
  if (entityIds.length === 0) {
    return [];
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("translations")
    .select("entity_id, value")
    .eq("entity_type", "item")
    .eq("field_name", fieldName)
    .eq("locale", LOCALE)
    .in("entity_id", entityIds)
    .overrideTypes<TranslationRow[], { merge: false }>();

  if (error) {
    throw new ItemFetchError(
      `Échec de la résolution des traductions d'objets (${fieldName}) : ${error.message}`,
      { cause: error },
    );
  }

  return data ?? [];
}

/**
 * Liste tous les objets du référentiel (fetch complet, filtrage en mémoire
 * côté appelant — même pattern que `listSpells`, volume raisonnable).
 */
export async function listItems(): Promise<ItemListItem[]> {
  const supabase = getSupabaseClient();
  const { data: itemRows, error } = await supabase
    .from("items")
    .select(ITEM_LIST_COLUMNS)
    .order("category", { ascending: true })
    .overrideTypes<ItemRow[], { merge: false }>();

  if (error) {
    throw new ItemFetchError(`Échec du chargement des objets : ${error.message}`, {
      cause: error,
    });
  }

  const items = itemRows ?? [];
  if (items.length === 0) {
    return [];
  }

  const nameRows = await fetchTranslationRows(
    items.map((item) => String(item.id)),
    "name",
  );

  return mergeItemListItems(items, nameRows).sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

async function fetchWeaponProperties(itemId: number): Promise<WeaponPropertiesRow | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("weapon_properties")
    .select("item_id, damage_dice, damage_type, properties, range")
    .eq("item_id", itemId)
    .maybeSingle()
    .overrideTypes<WeaponPropertiesRow, { merge: false }>();

  if (error) {
    throw new ItemFetchError(
      `Échec du chargement des propriétés d'arme de l'objet #${itemId} : ${error.message}`,
      { cause: error },
    );
  }

  return data ?? null;
}

async function fetchArmorProperties(itemId: number): Promise<ArmorPropertiesRow | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("armor_properties")
    .select("item_id, ac_base, ac_dex_bonus, strength_requirement, stealth_disadvantage")
    .eq("item_id", itemId)
    .maybeSingle()
    .overrideTypes<ArmorPropertiesRow, { merge: false }>();

  if (error) {
    throw new ItemFetchError(
      `Échec du chargement des propriétés d'armure de l'objet #${itemId} : ${error.message}`,
      { cause: error },
    );
  }

  return data ?? null;
}

/**
 * Récupère la fiche complète d'un objet par id, ou `null` si introuvable.
 * Charge aussi `weapon_properties`/`armor_properties` associées selon la
 * catégorie — deux requêtes séparées, pas de jointure nécessaire pour la V1
 * (voir la note du chef de projet).
 *
 * Enveloppée dans `React.cache` : `generateMetadata` et le composant de
 * page appellent tous les deux cette fonction pour le même id lors du même
 * rendu serveur — la déduplication évite une deuxième requête Supabase
 * identique (pattern recommandé par Next.js App Router, repris de `/sorts`).
 */
export const getItemById = cache(async function getItemById(
  id: number,
): Promise<ItemDetail | null> {
  const supabase = getSupabaseClient();
  const { data: itemRow, error } = await supabase
    .from("items")
    .select(ITEM_DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<ItemRow, { merge: false }>();

  if (error) {
    throw new ItemFetchError(`Échec du chargement de l'objet #${id} : ${error.message}`, {
      cause: error,
    });
  }

  if (!itemRow) {
    return null;
  }

  const entityId = String(itemRow.id);
  const isWeapon = itemRow.category === "arme";
  const isArmor = itemRow.category === "armure" || itemRow.category === "bouclier";

  const [nameRows, descriptionRows, weaponProperties, armorProperties] = await Promise.all([
    fetchTranslationRows([entityId], "name"),
    fetchTranslationRows([entityId], "description"),
    isWeapon ? fetchWeaponProperties(itemRow.id) : Promise.resolve(null),
    isArmor ? fetchArmorProperties(itemRow.id) : Promise.resolve(null),
  ]);

  return mergeItemDetail(itemRow, nameRows, descriptionRows, weaponProperties, armorProperties);
});
