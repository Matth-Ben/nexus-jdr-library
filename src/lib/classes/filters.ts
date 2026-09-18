import type { ClassFilters, ClassListItem } from "./types";

/** Forme brute de `searchParams` telle que fournie par Next.js App Router. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Traduit les `searchParams` de l'URL `/classes` en filtres exploitables —
 * fonction pure, testable indépendamment de Next.js et du réseau. Une
 * douzaine de classes ne justifie qu'une recherche par nom (pas de filtre
 * par dé de vie/source comme `/sorts` a niveau/école).
 */
export function parseClassFilters(searchParams: RawSearchParams): ClassFilters {
  const rawQuery = firstValue(searchParams.q)?.trim();

  return {
    query: rawQuery && rawQuery !== "" ? rawQuery : undefined,
  };
}

/**
 * Filtre une liste de classes déjà chargée en mémoire (recherche par nom) —
 * le référentiel (~13 classes) ne justifie pas de filtrage côté requête
 * Postgrest.
 */
export function filterClasses(
  classes: readonly ClassListItem[],
  filters: ClassFilters,
): ClassListItem[] {
  const normalizedQuery = filters.query?.trim().toLocaleLowerCase("fr");
  if (!normalizedQuery) {
    return [...classes];
  }

  return classes.filter((klass) => klass.name.toLocaleLowerCase("fr").includes(normalizedQuery));
}
