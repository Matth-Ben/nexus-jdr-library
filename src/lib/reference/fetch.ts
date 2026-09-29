import { getSupabaseClient } from "@/lib/supabase/client";

const LOCALE = "fr";
/** Taille de page PostgREST (plafond par défaut du projet : 1000 lignes). */
const PAGE_SIZE = 1000;
/** Au-delà, un filtre `in (...)` risque de dépasser la longueur d'URL acceptée. */
const IN_CHUNK_SIZE = 200;

/** Erreur levée quand une requête Supabase du référentiel échoue (réseau, RLS...). */
export class ReferenceFetchError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ReferenceFetchError";
  }
}

/** Filtre optionnel appliqué à une requête `select` (ex. `(q) => q.eq("class_id", 3)`). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type QueryRefiner = (query: any) => any;

/**
 * Lit toutes les lignes d'une table du référentiel, page par page — les
 * aptitudes de classe (~650) et leurs traductions approchent le plafond de
 * 1000 lignes par requête de PostgREST.
 */
export async function fetchAllRows<T>(
  table: string,
  columns: string,
  refine: QueryRefiner = (query) => query,
): Promise<T[]> {
  const supabase = getSupabaseClient();
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await refine(supabase.from(table).select(columns))
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      throw new ReferenceFetchError(`Échec du chargement de « ${table} » : ${error.message}`, {
        cause: error,
      });
    }
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) {
      return rows;
    }
  }
}

interface TranslationRow {
  entity_id: string;
  value: string;
}

/**
 * Traductions FR (`public.translations`) d'un type d'entité, indexées par
 * `entity_id`. Sans `ids`, charge toutes les traductions de ce type (pages
 * de liste) ; avec `ids`, seulement celles-ci (fiches de détail).
 */
export async function fetchTranslationMap(
  entityType: string,
  fieldName: string,
  ids?: readonly (number | string)[],
): Promise<Map<string, string>> {
  const base: QueryRefiner = (query) =>
    query.eq("entity_type", entityType).eq("field_name", fieldName).eq("locale", LOCALE);

  let rows: TranslationRow[];
  if (ids === undefined) {
    rows = await fetchAllRows<TranslationRow>("translations", "id, entity_id, value", base);
  } else {
    const unique = [...new Set(ids.map(String))];
    if (unique.length === 0) {
      return new Map();
    }
    const chunks: string[][] = [];
    for (let i = 0; i < unique.length; i += IN_CHUNK_SIZE) {
      chunks.push(unique.slice(i, i + IN_CHUNK_SIZE));
    }
    const results = await Promise.all(
      chunks.map((chunk) =>
        fetchAllRows<TranslationRow>("translations", "id, entity_id, value", (query) =>
          base(query).in("entity_id", chunk),
        ),
      ),
    );
    rows = results.flat();
  }

  return new Map(rows.map((row) => [row.entity_id, row.value]));
}
