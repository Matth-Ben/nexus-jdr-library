import type { RaceFilters, RaceListItem } from "./types";

/** Forme brute de `searchParams` telle que fournie par Next.js App Router. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Traduit les `searchParams` de l'URL `/races` en filtres exploitables —
 * fonction pure, testable indépendamment de Next.js et du réseau. Une
 * douzaine de races seulement : recherche par nom uniquement, pas de filtre
 * supplémentaire nécessaire.
 */
export function parseRaceFilters(searchParams: RawSearchParams): RaceFilters {
  const rawQuery = firstValue(searchParams.q)?.trim();

  return {
    query: rawQuery && rawQuery !== "" ? rawQuery : undefined,
  };
}

/**
 * Filtre une liste de races déjà chargée en mémoire (recherche par nom) —
 * pas de filtrage côté requête Postgrest, volume du référentiel trop faible
 * pour le justifier.
 */
export function filterRaces(
  races: readonly RaceListItem[],
  filters: RaceFilters,
): RaceListItem[] {
  const normalizedQuery = filters.query?.trim().toLocaleLowerCase("fr");
  if (!normalizedQuery) {
    return [...races];
  }

  return races.filter((race) => race.name.toLocaleLowerCase("fr").includes(normalizedQuery));
}
