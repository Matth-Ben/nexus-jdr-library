import { describe, expect, it } from "vitest";
import { filterRaces, parseRaceFilters } from "./filters";
import type { RaceListItem } from "./types";

const RACES: RaceListItem[] = [
  { id: 1, name: "Elfe", size: "Moyenne", speed: 9, source: "Manuel des joueurs" },
  { id: 2, name: "Halfelin", size: "Petite", speed: 7, source: "Manuel des joueurs" },
  { id: 3, name: "Demi-elfe", size: "Moyenne", speed: 9, source: "Manuel des joueurs" },
];

describe("parseRaceFilters", () => {
  it("ignore les paramètres absents ou vides", () => {
    expect(parseRaceFilters({})).toEqual({ query: undefined });
    expect(parseRaceFilters({ q: "" })).toEqual({ query: undefined });
  });

  it("lit la recherche par nom, en ignorant les espaces superflus", () => {
    expect(parseRaceFilters({ q: "  elfe  " })).toEqual({ query: "elfe" });
  });

  it("prend la première valeur quand searchParams fournit un tableau", () => {
    expect(parseRaceFilters({ q: ["premier", "second"] }).query).toBe("premier");
  });
});

describe("filterRaces", () => {
  it("renvoie toutes les races quand aucun filtre n'est actif", () => {
    expect(filterRaces(RACES, {})).toHaveLength(3);
  });

  it("filtre par nom, insensible à la casse", () => {
    expect(filterRaces(RACES, { query: "HALFELIN" }).map((r) => r.id)).toEqual([2]);
  });

  it("filtre par sous-chaîne (ex. 'elfe' matche Elfe et Demi-elfe)", () => {
    expect(filterRaces(RACES, { query: "elfe" }).map((r) => r.id)).toEqual([1, 3]);
  });

  it("renvoie une liste vide quand rien ne correspond", () => {
    expect(filterRaces(RACES, { query: "orque" })).toEqual([]);
  });

  it("ne mute pas le tableau d'entrée", () => {
    const copy = [...RACES];
    filterRaces(RACES, { query: "elfe" });
    expect(RACES).toEqual(copy);
  });
});
