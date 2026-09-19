import type { RawSearchParams } from "@/lib/spells/filters";

type ParamValue = string | number | undefined | null;

function toQueryString(params: Record<string, ParamValue>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  }
  return query.toString();
}

/** Lit `?open=` : identifiant entier strictement positif, sinon `undefined`. */
export function parseOpenId(raw: RawSearchParams[string]): number | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) {
    return undefined;
  }
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

/** URL de la liste avec les filtres en cours et l'élément `id` ouvert dans le panneau. */
export function panelHref(base: string, filters: Record<string, ParamValue>, id: number | string): string {
  return `${base}?${toQueryString({ ...filters, open: id })}`;
}

/** URL de la liste avec les filtres en cours, panneau fermé. */
export function closeHref(base: string, filters: Record<string, ParamValue>): string {
  const query = toQueryString(filters);
  return query ? `${base}?${query}` : base;
}
