import { describe, expect, it } from "vitest";
import { filterSpells, listSchools, parseSpellFilters, SPELL_LEVELS } from "./filters";
import type { SpellListItem } from "./types";

const SPELLS: SpellListItem[] = [
  {
    id: 1,
    name: "Projectile magique",
    level: 1,
    school: "Évocation",
    castingTime: "1 action",
    concentration: false,
  },
  {
    id: 2,
    name: "Boule de feu",
    level: 3,
    school: "Évocation",
    castingTime: "1 action",
    concentration: false,
  },
  {
    id: 3,
    name: "Lumière",
    level: 0,
    school: "Évocation",
    castingTime: "1 action",
    concentration: false,
  },
  {
    id: 4,
    name: "Bouclier de la foi",
    level: 1,
    school: "Abjuration",
    castingTime: "1 action bonus",
    concentration: true,
  },
];

describe("parseSpellFilters", () => {
  it("ignore les paramètres absents ou vides", () => {
    expect(parseSpellFilters({})).toEqual({
      query: undefined,
      level: undefined,
      school: undefined,
    });
    expect(parseSpellFilters({ q: "", level: "", school: "" })).toEqual({
      query: undefined,
      level: undefined,
      school: undefined,
    });
  });

  it("lit la recherche par nom, en ignorant les espaces superflus", () => {
    expect(parseSpellFilters({ q: "  boule  " })).toEqual({
      query: "boule",
      level: undefined,
      school: undefined,
    });
  });

  it("convertit le niveau en nombre, y compris le niveau 0 (tour de magie)", () => {
    expect(parseSpellFilters({ level: "0" }).level).toBe(0);
    expect(parseSpellFilters({ level: "3" }).level).toBe(3);
  });

  it("ignore un niveau non numérique plutôt que de planter", () => {
    expect(parseSpellFilters({ level: "abc" }).level).toBeUndefined();
  });

  it("lit l'école directement", () => {
    expect(parseSpellFilters({ school: "Évocation" }).school).toBe("Évocation");
  });

  it("prend la première valeur quand searchParams fournit un tableau", () => {
    expect(parseSpellFilters({ q: ["premier", "second"] }).query).toBe("premier");
  });
});

describe("filterSpells", () => {
  it("renvoie tous les sorts quand aucun filtre n'est actif", () => {
    expect(filterSpells(SPELLS, {})).toHaveLength(4);
  });

  it("filtre par nom, insensible à la casse", () => {
    const result = filterSpells(SPELLS, { query: "boule" });
    expect(result.map((s) => s.id)).toEqual([2]);
  });

  it("filtre par niveau, y compris le niveau 0", () => {
    expect(filterSpells(SPELLS, { level: 0 }).map((s) => s.id)).toEqual([3]);
    expect(filterSpells(SPELLS, { level: 1 }).map((s) => s.id)).toEqual([1, 4]);
  });

  it("filtre par école", () => {
    expect(filterSpells(SPELLS, { school: "Abjuration" }).map((s) => s.id)).toEqual([4]);
  });

  it("combine recherche, niveau et école", () => {
    const result = filterSpells(SPELLS, {
      query: "projectile",
      level: 1,
      school: "Évocation",
    });
    expect(result.map((s) => s.id)).toEqual([1]);
  });

  it("renvoie une liste vide quand rien ne correspond", () => {
    expect(filterSpells(SPELLS, { query: "sort inexistant" })).toEqual([]);
  });
});

describe("listSchools", () => {
  it("renvoie les écoles distinctes, triées", () => {
    expect(listSchools(SPELLS)).toEqual(["Abjuration", "Évocation"]);
  });

  it("renvoie une liste vide pour un jeu de sorts vide", () => {
    expect(listSchools([])).toEqual([]);
  });
});

describe("SPELL_LEVELS", () => {
  it("couvre les tours de magie (0) jusqu'au niveau 9", () => {
    expect(SPELL_LEVELS).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});
