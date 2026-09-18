import type { SpellFilters, SpellListItem } from "./types";

/** Niveaux de sorts D&D 5e : 0 = tour de magie, 1-9 = niveaux de sort. */
export const SPELL_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/** Forme brute de `searchParams` telle que fournie par Next.js App Router. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Traduit les `searchParams` de l'URL `/sorts` en filtres exploitables —
 * fonction pure, testable indépendamment de Next.js et du réseau.
 */
export function parseSpellFilters(searchParams: RawSearchParams): SpellFilters {
  const rawQuery = firstValue(searchParams.q)?.trim();
  const rawLevel = firstValue(searchParams.level)?.trim();
  const rawSchool = firstValue(searchParams.school)?.trim();

  const level = rawLevel !== undefined && rawLevel !== "" ? Number(rawLevel) : undefined;

  return {
    query: rawQuery && rawQuery !== "" ? rawQuery : undefined,
    level: level !== undefined && !Number.isNaN(level) ? level : undefined,
    school: rawSchool && rawSchool !== "" ? rawSchool : undefined,
  };
}

/**
 * Filtre une liste de sorts déjà chargée en mémoire (recherche par nom,
 * niveau, école) — pas de filtrage côté requête Postgrest, voir la note du
 * chef de projet sur le volume raisonnable (~477 lignes) du référentiel.
 */
export function filterSpells(
  spells: readonly SpellListItem[],
  filters: SpellFilters,
): SpellListItem[] {
  const normalizedQuery = filters.query?.trim().toLocaleLowerCase("fr");

  return spells.filter((spell) => {
    if (normalizedQuery && !spell.name.toLocaleLowerCase("fr").includes(normalizedQuery)) {
      return false;
    }
    if (filters.level !== undefined && spell.level !== filters.level) {
      return false;
    }
    if (filters.school && spell.school !== filters.school) {
      return false;
    }
    return true;
  });
}

/**
 * Liste triée des écoles distinctes présentes dans un jeu de sorts — les
 * sorts sans école renseignée (`school: null`, ex. placeholders d'import
 * XML) n'apparaissent pas dans le filtre, ils restent visibles dans la
 * liste via le fallback d'affichage.
 */
export function listSchools(spells: readonly SpellListItem[]): string[] {
  const schools = spells
    .map((spell) => spell.school)
    .filter((school): school is string => school !== null);
  return Array.from(new Set(schools)).sort((a, b) => a.localeCompare(b, "fr"));
}
