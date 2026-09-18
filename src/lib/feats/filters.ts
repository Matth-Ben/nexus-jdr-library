import type { FeatFilters, FeatListItem } from "./types";

/** Forme brute de `searchParams` telle que fournie par Next.js App Router. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Traduit les `searchParams` de l'URL `/dons` en filtres exploitables —
 * fonction pure, testable indépendamment de Next.js et du réseau. Recherche
 * par nom uniquement : ~42 dons ne justifient pas de filtre supplémentaire
 * (voir la consigne du chef de projet pour cette tâche).
 */
export function parseFeatFilters(searchParams: RawSearchParams): FeatFilters {
  const rawQuery = firstValue(searchParams.q)?.trim();

  return {
    query: rawQuery && rawQuery !== "" ? rawQuery : undefined,
  };
}

/**
 * Filtre une liste de dons déjà chargée en mémoire (recherche par nom) — pas
 * de filtrage côté requête Postgrest, le volume (~42 lignes) ne le justifie
 * pas, même raisonnement que `filterSpells`.
 */
export function filterFeats(
  feats: readonly FeatListItem[],
  filters: FeatFilters,
): FeatListItem[] {
  const normalizedQuery = filters.query?.trim().toLocaleLowerCase("fr");

  return feats.filter((feat) => {
    if (normalizedQuery && !feat.name.toLocaleLowerCase("fr").includes(normalizedQuery)) {
      return false;
    }
    return true;
  });
}
