import { describe, expect, it } from "vitest";
import { matchesQuery, parseIdParam, parseTextQuery, refHref } from "./routes";

describe("refHref", () => {
  it("ouvre la fiche dans le panneau de la page du type d'élément", () => {
    expect(refHref("subclass", 12)).toBe("/sous-classes?open=12");
    expect(refHref("feature", 261)).toBe("/aptitudes?open=261");
    expect(refHref("lineage", 1)).toBe("/lignees?open=1");
    expect(refHref("spell", 8)).toBe("/sorts?open=8");
  });
});

describe("parseTextQuery", () => {
  it("nettoie la recherche et ignore une valeur vide", () => {
    expect(parseTextQuery("  pacte  ")).toBe("pacte");
    expect(parseTextQuery("   ")).toBeUndefined();
    expect(parseTextQuery(undefined)).toBeUndefined();
    expect(parseTextQuery(["lame", "chaîne"])).toBe("lame");
  });
});

describe("parseIdParam", () => {
  it("n'accepte qu'un entier strictement positif", () => {
    expect(parseIdParam("3")).toBe(3);
    expect(parseIdParam("0")).toBeUndefined();
    expect(parseIdParam("-2")).toBeUndefined();
    expect(parseIdParam("1.5")).toBeUndefined();
    expect(parseIdParam("abc")).toBeUndefined();
    expect(parseIdParam(undefined)).toBeUndefined();
  });
});

describe("matchesQuery", () => {
  it("laisse tout passer sans recherche", () => {
    expect(matchesQuery(undefined, "Rage")).toBe(true);
  });

  it("ignore la casse et les accents", () => {
    expect(matchesQuery("chaine", "Pacte de la chaîne")).toBe(true);
    expect(matchesQuery("ÉLÉMENT", "Disciple des éléments")).toBe(true);
  });

  it("cherche dans chacun des textes fournis, en ignorant les absents", () => {
    expect(matchesQuery("occultiste", "Invocations occultes", null, "Occultiste")).toBe(true);
    expect(matchesQuery("barde", "Rage", undefined, "Barbare")).toBe(false);
  });
});
