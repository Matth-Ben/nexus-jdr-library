import { describe, expect, it } from "vitest";
import { filterItems, ITEM_CATEGORIES, parseItemFilters } from "./filters";
import type { ItemListItem } from "./types";

const ITEMS: ItemListItem[] = [
  {
    id: 1,
    name: "Épée longue",
    category: "arme",
    cost: { amount: 15, currency: "po" },
    weight: 1.5,
  },
  {
    id: 2,
    name: "Cotte de mailles",
    category: "armure",
    cost: { amount: 75, currency: "po" },
    weight: 20,
  },
  {
    id: 3,
    name: "Bouclier",
    category: "bouclier",
    cost: { amount: 10, currency: "po" },
    weight: 3,
  },
  {
    id: 4,
    name: "Outils de voleur",
    category: "outil",
    cost: { amount: 25, currency: "po" },
    weight: 0.5,
  },
];

describe("parseItemFilters", () => {
  it("ignore les paramètres absents ou vides", () => {
    expect(parseItemFilters({})).toEqual({ query: undefined, category: undefined });
    expect(parseItemFilters({ q: "", category: "" })).toEqual({
      query: undefined,
      category: undefined,
    });
  });

  it("lit la recherche par nom, en ignorant les espaces superflus", () => {
    expect(parseItemFilters({ q: "  épée  " })).toEqual({
      query: "épée",
      category: undefined,
    });
  });

  it("lit la catégorie directement", () => {
    expect(parseItemFilters({ category: "arme" }).category).toBe("arme");
  });

  it("prend la première valeur quand searchParams fournit un tableau", () => {
    expect(parseItemFilters({ q: ["premier", "second"] }).query).toBe("premier");
  });
});

describe("filterItems", () => {
  it("renvoie tous les objets quand aucun filtre n'est actif", () => {
    expect(filterItems(ITEMS, {})).toHaveLength(4);
  });

  it("filtre par nom, insensible à la casse", () => {
    const result = filterItems(ITEMS, { query: "épée" });
    expect(result.map((i) => i.id)).toEqual([1]);
  });

  it("filtre par catégorie", () => {
    expect(filterItems(ITEMS, { category: "outil" }).map((i) => i.id)).toEqual([4]);
  });

  it("combine recherche et catégorie", () => {
    const result = filterItems(ITEMS, { query: "bouclier", category: "bouclier" });
    expect(result.map((i) => i.id)).toEqual([3]);
  });

  it("renvoie une liste vide quand rien ne correspond", () => {
    expect(filterItems(ITEMS, { query: "objet inexistant" })).toEqual([]);
  });
});

describe("ITEM_CATEGORIES", () => {
  it("couvre les 7 catégories du schéma (contrainte CHECK de items.category)", () => {
    expect(ITEM_CATEGORIES).toEqual([
      "arme",
      "armure",
      "bouclier",
      "outil",
      "equipement_general",
      "objet_magique",
      "monture_vehicule",
    ]);
  });
});
