import { describe, expect, it } from "vitest";
import { libraryHref, modificationHref, parseTargetId } from "./target";

describe("parseTargetId", () => {
  it.each([
    ["1", 1],
    ["42", 42],
    [" 7 ", 7],
    ["2147483647", 2147483647],
    [12, 12],
    [["5", "9"], 5],
  ])("accepte %j", (raw, expected) => {
    expect(parseTargetId(raw)).toBe(expected);
  });

  it.each([
    "",
    "0",
    "-1",
    "+3",
    "007",
    "1.5",
    "1e3",
    "0x10",
    "abc",
    "12abc",
    "2147483648",
    "99999999999999999999",
    "1 2",
    "' or 1=1 --",
  ])("rejette la chaîne %j", (raw) => {
    expect(parseTargetId(raw)).toBeNull();
  });

  it("rejette les valeurs non entières ou hors bornes", () => {
    expect(parseTargetId(undefined)).toBeNull();
    expect(parseTargetId(null)).toBeNull();
    expect(parseTargetId(0)).toBeNull();
    expect(parseTargetId(-4)).toBeNull();
    expect(parseTargetId(1.5)).toBeNull();
    expect(parseTargetId(Number.NaN)).toBeNull();
    expect(parseTargetId(2147483648)).toBeNull();
    expect(parseTargetId({})).toBeNull();
    expect(parseTargetId([])).toBeNull();
  });
});

describe("liens", () => {
  it("pointe vers la bibliothèque, panneau ouvert", () => {
    expect(libraryHref("spell", 3)).toBe("/sorts?open=3");
    expect(libraryHref("feat", 3)).toBe("/dons?open=3");
    expect(libraryHref("item", 3)).toBe("/objets?open=3");
    expect(libraryHref("race", 3)).toBe("/races?open=3");
    expect(libraryHref("class", 3)).toBe("/classes?open=3");
  });

  it("pointe vers le formulaire de modification", () => {
    expect(modificationHref("class", 12)).toBe("/propositions/nouvelle?type=class&cible=12");
  });
});
