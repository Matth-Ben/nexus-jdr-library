import { panelHref } from "@/lib/panel";

/** Page de liste de chaque type d'élément du référentiel. */
export const REFERENCE_PATHS = {
  spell: "/sorts",
  class: "/classes",
  subclass: "/sous-classes",
  feature: "/aptitudes",
  option: "/options-de-classe",
  invocation: "/invocations",
  race: "/races",
  subrace: "/sous-races",
  lineage: "/lignees",
  feat: "/dons",
  item: "/objets",
} as const;

export type ReferenceKind = keyof typeof REFERENCE_PATHS;

/** Lien vers la fiche d'un élément, ouverte dans le panneau de sa propre page. */
export function refHref(kind: ReferenceKind, id: number): string {
  return panelHref(REFERENCE_PATHS[kind], {}, id);
}

/** Forme brute de `searchParams` telle que fournie par Next.js App Router. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Recherche texte `?q=`, `undefined` si vide. */
export function parseTextQuery(raw: string | string[] | undefined): string | undefined {
  const value = firstValue(raw)?.trim();
  return value ? value : undefined;
}

/** Identifiant entier strictement positif (`?classe=3`), sinon `undefined`. */
export function parseIdParam(raw: string | string[] | undefined): number | undefined {
  const value = firstValue(raw);
  if (!value) {
    return undefined;
  }
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

/** Recherche insensible à la casse et aux accents sur un ou plusieurs textes. */
export function matchesQuery(query: string | undefined, ...texts: (string | null | undefined)[]): boolean {
  if (!query) {
    return true;
  }
  const needle = normalize(query);
  return texts.some((text) => text != null && normalize(text).includes(needle));
}

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("fr");
}
