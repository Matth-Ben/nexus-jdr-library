import { describe, expect, it } from "vitest";
import { classOptionTypeOrder, formatClassOptionType, isClassOptionType } from "@/lib/class-options/format";
import { MISSING_NAME, formatLanguages, toBackgroundDetail } from "./format";
import type { BackgroundRow } from "./types";

const ROW: BackgroundRow = {
  id: 3,
  skill_proficiencies: ["Athlétisme", "Survie"],
  tool_or_language_choices: { tools: ["Outils de navigateur"], vehicles: ["véhicules d'eau"] },
  equipment: ["Grappin", "Bourse (10 po)"],
  is_incomplete: false,
};

const EMPTY = new Map<string, string>();

describe("historiques", () => {
  it("décrit les langues au choix", () => {
    expect(formatLanguages({ languages: 2 })).toBe("2 langues au choix");
    expect(formatLanguages({ languages: 1, language_choices: ["Nain"] })).toBe(
      "1 langue au choix (Nain)",
    );
    expect(formatLanguages({ tools: ["Kit de déguisement"] })).toBeNull();
    expect(formatLanguages(null)).toBeNull();
  });

  it("assemble la fiche", () => {
    const detail = toBackgroundDetail(ROW, {
      names: new Map([["3", "Marin"]]),
      descriptions: EMPTY,
      featureNames: new Map([["3", "Passage sur un navire"]]),
      featureDescriptions: EMPTY,
    });
    expect(detail).toMatchObject({
      name: "Marin",
      skills: ["Athlétisme", "Survie"],
      tools: ["Outils de navigateur"],
      vehicles: ["véhicules d'eau"],
      languages: null,
      equipment: ["Grappin", "Bourse (10 po)"],
      featureName: "Passage sur un navire",
      featureDescription: null,
      description: null,
      incomplete: false,
    });
  });

  it("signale un nom manquant", () => {
    const detail = toBackgroundDetail(
      { ...ROW, skill_proficiencies: null, equipment: null, tool_or_language_choices: null },
      { names: EMPTY, descriptions: EMPTY, featureNames: EMPTY, featureDescriptions: EMPTY },
    );
    expect(detail.name).toBe(MISSING_NAME);
    expect(detail.skills).toEqual([]);
    expect(detail.equipment).toEqual([]);
  });
});

describe("types d'options de classe", () => {
  it("reconnaît les types connus et donne leur libellé", () => {
    expect(isClassOptionType("manoeuvre")).toBe(true);
    expect(isClassOptionType("invocation")).toBe(false);
    expect(isClassOptionType(null)).toBe(false);
    expect(formatClassOptionType("discipline_elementaire")).toBe("Disciplines élémentaires");
    expect(formatClassOptionType("autre_type")).toBe("autre type");
  });

  it("ordonne les types, les inconnus en dernier", () => {
    expect(classOptionTypeOrder("manoeuvre")).toBeLessThan(classOptionTypeOrder("infusion"));
    expect(classOptionTypeOrder("inconnu")).toBeGreaterThan(classOptionTypeOrder("infusion"));
  });
});
