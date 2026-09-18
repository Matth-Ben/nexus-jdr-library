import { describe, expect, it } from "vitest";
import { filterClasses, parseClassFilters } from "./filters";
import type { ClassListItem } from "./types";

const CLASSES: ClassListItem[] = [
  { id: 1, name: "Guerrier", hitDie: 10, source: "Manuel des joueurs" },
  { id: 2, name: "Magicien", hitDie: 6, source: "Manuel des joueurs" },
  { id: 3, name: "Rôdeur", hitDie: 10, source: null },
];

describe("parseClassFilters", () => {
  it("ignore les paramètres absents ou vides", () => {
    expect(parseClassFilters({})).toEqual({ query: undefined });
    expect(parseClassFilters({ q: "" })).toEqual({ query: undefined });
  });

  it("lit la recherche par nom, en ignorant les espaces superflus", () => {
    expect(parseClassFilters({ q: "  gue  " })).toEqual({ query: "gue" });
  });

  it("prend la première valeur quand searchParams fournit un tableau", () => {
    expect(parseClassFilters({ q: ["premier", "second"] }).query).toBe("premier");
  });
});

describe("filterClasses", () => {
  it("renvoie toutes les classes quand aucun filtre n'est actif", () => {
    expect(filterClasses(CLASSES, {})).toHaveLength(3);
  });

  it("filtre par nom, insensible à la casse", () => {
    const result = filterClasses(CLASSES, { query: "magi" });
    expect(result.map((c) => c.id)).toEqual([2]);
  });

  it("gère les accents/majuscules de façon cohérente avec la locale fr", () => {
    const result = filterClasses(CLASSES, { query: "RÔDEUR" });
    expect(result.map((c) => c.id)).toEqual([3]);
  });

  it("renvoie une liste vide quand rien ne correspond", () => {
    expect(filterClasses(CLASSES, { query: "classe inexistante" })).toEqual([]);
  });

  it("ne modifie pas le tableau d'entrée", () => {
    const result = filterClasses(CLASSES, {});
    expect(result).not.toBe(CLASSES);
    expect(result).toEqual(CLASSES);
  });
});
