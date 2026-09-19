import { describe, expect, it } from "vitest";
import { hasContent, jsonbTextBytes, readInteger, readLines, submittedIndexes } from "./rows";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("submittedIndexes", () => {
  it("renvoie les index distincts triés numériquement (10 après 2)", () => {
    const input = form({ "traits.10.name": "a", "traits.2.name": "b", "traits.2.description": "c", "traits.0.name": "d" });
    expect(submittedIndexes(input, "traits")).toEqual([0, 2, 10]);
  });

  it("ne confond pas un préfixe voisin ni un champ imbriqué", () => {
    const input = form({ "traits.0.name": "a", "traitsX.1.name": "b", "subraces.3.traits.5.name": "c", "traits.name": "d" });
    expect(submittedIndexes(input, "traits")).toEqual([0]);
    expect(submittedIndexes(input, "subraces")).toEqual([3]);
    expect(submittedIndexes(input, "subraces.3.traits")).toEqual([5]);
  });

  it("fonctionne aussi sur un objet et échappe les caractères spéciaux du préfixe", () => {
    expect(submittedIndexes({ "a.b.1.x": "1", "aXb.2.x": "2" }, "a.b")).toEqual([1]);
  });

  it("refuse les index non canoniques (zéros de tête, plus de 4 chiffres, signes)", () => {
    const input = form({ "l.01.x": "a", "l.12345.x": "b", "l.-1.x": "c", "l.1.x": "d" });
    expect(submittedIndexes(input, "l")).toEqual([1]);
  });
});

describe("hasContent", () => {
  it("détecte un champ non vide sous le préfixe de ligne, imbriqué compris", () => {
    expect(hasContent(form({ "r.0.name": " ", "r.0.d": "" }), "r.0")).toBe(false);
    expect(hasContent(form({ "r.0.name": " ", "r.0.t.0.x": "y" }), "r.0")).toBe(true);
  });

  it("ne déborde pas sur la ligne 10 quand on teste la ligne 1", () => {
    expect(hasContent(form({ "r.10.name": "x", "r.1.name": "" }), "r.1")).toBe(false);
  });

  it("compte un nombre ou un booléen d'objet JSON comme du contenu", () => {
    expect(hasContent({ "r.0.n": 0 }, "r.0")).toBe(true);
    expect(hasContent({ "r.0.n": null, "r.0.m": undefined }, "r.0")).toBe(false);
  });
});

describe("readInteger", () => {
  it.each([
    ["12", 12],
    [" -2 ", -2],
    ["+3", 3],
    ["-0", 0],
    [7, 7],
  ])("lit %j", (value, expected) => {
    expect(readInteger({ n: value }, "n")).toBe(expected);
  });

  it.each(["1.5", "1,5", "1e3", "0x10", "abc", "1234567", "٣", {}, NaN, 1.5])("refuse %j", (value) => {
    expect(readInteger({ n: value }, "n")).toBe("invalid");
  });

  it("distingue l'absence d'une valeur invalide", () => {
    expect(readInteger({}, "n")).toBe("empty");
    expect(readInteger({ n: "  " }, "n")).toBe("empty");
    expect(readInteger({ n: null }, "n")).toBe("empty");
  });
});

describe("readLines", () => {
  const read = (value: unknown, options = { max: 3, itemMax: 5, noun: "valeurs" }) => {
    const errors: Record<string, string> = {};
    return { lines: readLines({ f: value }, "f", errors, options), errors };
  };

  it("absent ou vide : liste vide sans erreur", () => {
    expect(read(undefined)).toEqual({ lines: [], errors: {} });
    expect(read("")).toEqual({ lines: [], errors: {} });
    expect(read(" \n \n")).toEqual({ lines: [], errors: {} });
  });

  it("refuse un type non texte", () => {
    expect(read(["a"]).errors.f).toBeDefined();
  });

  it("compte les caractères Unicode, pas les unités UTF-16", () => {
    expect(read("😀😀😀😀😀").errors.f).toBeUndefined();
    expect(read("😀😀😀😀😀😀").errors.f).toMatch(/5/);
  });

  it("borne le nombre de lignes", () => {
    expect(read("a\nb\nc").lines).toEqual(["a", "b", "c"]);
    expect(read("a\nb\nc\nd").errors.f).toMatch(/3/);
  });

  it("insensible à la casse et aux accents identiques pour les doublons", () => {
    expect(read("Élan\nélan").errors.f).toMatch(/double/);
  });
});

describe("jsonbTextBytes", () => {
  it("reproduit le format de Postgres (espace après « : » et « , »)", () => {
    expect(jsonbTextBytes({ a: 1, b: [1, 2], c: { d: "x" } })).toBe('{"a": 1, "b": [1, 2], "c": {"d": "x"}}'.length);
  });

  it("compte les octets UTF-8", () => {
    expect(jsonbTextBytes({ a: "é" })).toBe(new TextEncoder().encode('{"a": "é"}').length);
    expect(jsonbTextBytes("😀")).toBe(6); // guillemets + 4 octets
  });

  it("gère vide, null, booléens", () => {
    expect(jsonbTextBytes({})).toBe(2);
    expect(jsonbTextBytes([])).toBe(2);
    expect(jsonbTextBytes({ a: null, b: true, c: [] })).toBe('{"a": null, "b": true, "c": []}'.length);
  });
});
