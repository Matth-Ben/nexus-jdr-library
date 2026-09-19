import { describe, expect, it } from "vitest";
import { safeNextPath } from "./redirect";

describe("safeNextPath", () => {
  it("garde un chemin interne, avec sa query", () => {
    expect(safeNextPath("/sorts")).toBe("/sorts");
    expect(safeNextPath("/sorts?q=feu&open=3")).toBe("/sorts?q=feu&open=3");
  });

  it("retombe sur l'accueil pour une valeur absente ou non textuelle", () => {
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath("")).toBe("/");
    expect(safeNextPath(new File([], "x"))).toBe("/");
  });

  it("refuse toute redirection vers un autre site", () => {
    expect(safeNextPath("https://evil.example")).toBe("/");
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath("/\\evil.example")).toBe("/");
    expect(safeNextPath("javascript:alert(1)")).toBe("/");
    expect(safeNextPath("sorts")).toBe("/");
  });

  it("refuse les caractères de contrôle (injection d'en-tête)", () => {
    expect(safeNextPath("/sorts" + String.fromCharCode(13, 10) + "Set-Cookie: x=1")).toBe("/");
  });

  it("prend la première valeur d'un tableau (searchParams)", () => {
    expect(safeNextPath(["/races", "/dons"])).toBe("/races");
  });
});
