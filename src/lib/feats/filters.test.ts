import { describe, expect, it } from "vitest";
import { filterFeats, parseFeatFilters } from "./filters";
import type { FeatListItem } from "./types";

const FEATS: FeatListItem[] = [
  { id: 1, name: "Athlète", prerequisiteText: null },
  { id: 2, name: "Chanceux", prerequisiteText: null },
  { id: 3, name: "Attaque à outrance", prerequisiteText: "Force 13 ou plus" },
];

describe("parseFeatFilters", () => {
  it("ignore les paramètres absents ou vides", () => {
    expect(parseFeatFilters({})).toEqual({ query: undefined });
    expect(parseFeatFilters({ q: "" })).toEqual({ query: undefined });
  });

  it("lit la recherche par nom, en ignorant les espaces superflus", () => {
    expect(parseFeatFilters({ q: "  chance  " })).toEqual({ query: "chance" });
  });

  it("prend la première valeur quand searchParams fournit un tableau", () => {
    expect(parseFeatFilters({ q: ["premier", "second"] }).query).toBe("premier");
  });
});

describe("filterFeats", () => {
  it("renvoie tous les dons quand aucun filtre n'est actif", () => {
    expect(filterFeats(FEATS, {})).toHaveLength(3);
  });

  it("filtre par nom, insensible à la casse", () => {
    const result = filterFeats(FEATS, { query: "athlète" });
    expect(result.map((f) => f.id)).toEqual([1]);
  });

  it("filtre par nom partiel", () => {
    const result = filterFeats(FEATS, { query: "attaque" });
    expect(result.map((f) => f.id)).toEqual([3]);
  });

  it("renvoie une liste vide quand rien ne correspond", () => {
    expect(filterFeats(FEATS, { query: "don inexistant" })).toEqual([]);
  });
});
