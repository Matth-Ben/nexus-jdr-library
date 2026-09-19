import { describe, expect, it } from "vitest";
import { closeHref, panelHref, parseOpenId } from "./panel";

describe("parseOpenId", () => {
  it("lit un identifiant entier positif", () => {
    expect(parseOpenId("12")).toBe(12);
    expect(parseOpenId(["7", "9"])).toBe(7);
  });

  it("ignore les valeurs absentes ou invalides", () => {
    expect(parseOpenId(undefined)).toBeUndefined();
    expect(parseOpenId("")).toBeUndefined();
    expect(parseOpenId("abc")).toBeUndefined();
    expect(parseOpenId("0")).toBeUndefined();
    expect(parseOpenId("-3")).toBeUndefined();
    expect(parseOpenId("1.5")).toBeUndefined();
  });
});

describe("panelHref / closeHref", () => {
  it("ajoute open et garde les filtres renseignés, y compris le niveau 0", () => {
    expect(panelHref("/sorts", { q: "feu", level: 0, school: undefined }, 5)).toBe(
      "/sorts?q=feu&level=0&open=5",
    );
  });

  it("omet les filtres vides", () => {
    expect(panelHref("/dons", { q: "" }, 3)).toBe("/dons?open=3");
  });

  it("encode les caractères spéciaux", () => {
    expect(panelHref("/sorts", { q: "boule de feu", school: "Évocation" }, 1)).toBe(
      "/sorts?q=boule+de+feu&school=%C3%89vocation&open=1",
    );
  });

  it("closeHref renvoie la liste sans open, ou la base seule sans filtre", () => {
    expect(closeHref("/sorts", { q: "feu", level: 0 })).toBe("/sorts?q=feu&level=0");
    expect(closeHref("/sorts", { q: undefined })).toBe("/sorts");
  });
});
