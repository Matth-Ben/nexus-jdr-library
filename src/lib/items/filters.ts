import type { ItemCategory, ItemFilters, ItemListItem } from "./types";

/** Catégories d'objets D&D 5e, dans l'ordre attendu du filtre `/objets`. */
export const ITEM_CATEGORIES: readonly ItemCategory[] = [
  "arme",
  "armure",
  "bouclier",
  "outil",
  "equipement_general",
  "objet_magique",
  "monture_vehicule",
] as const;

/** Forme brute de `searchParams` telle que fournie par Next.js App Router. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Traduit les `searchParams` de l'URL `/objets` en filtres exploitables —
 * fonction pure, testable indépendamment de Next.js et du réseau.
 */
export function parseItemFilters(searchParams: RawSearchParams): ItemFilters {
  const rawQuery = firstValue(searchParams.q)?.trim();
  const rawCategory = firstValue(searchParams.category)?.trim();

  return {
    query: rawQuery && rawQuery !== "" ? rawQuery : undefined,
    category: rawCategory && rawCategory !== "" ? rawCategory : undefined,
  };
}

/**
 * Filtre une liste d'objets déjà chargée en mémoire (recherche par nom,
 * catégorie) — pas de filtrage côté requête Postgrest, même pattern que
 * `/sorts` (volume raisonnable du référentiel).
 */
export function filterItems(
  items: readonly ItemListItem[],
  filters: ItemFilters,
): ItemListItem[] {
  const normalizedQuery = filters.query?.trim().toLocaleLowerCase("fr");

  return items.filter((item) => {
    if (normalizedQuery && !item.name.toLocaleLowerCase("fr").includes(normalizedQuery)) {
      return false;
    }
    if (filters.category && item.category !== filters.category) {
      return false;
    }
    return true;
  });
}
