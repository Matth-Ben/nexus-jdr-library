import { describe, expect, it } from "vitest";
import {
  buildTranslationMap,
  formatPrerequisiteText,
  mergeFeatDetail,
  mergeFeatListItems,
} from "./translations";
import type { FeatRow, TranslationRow } from "./types";

describe("buildTranslationMap", () => {
  it("indexe les lignes translations par entity_id", () => {
    const rows: TranslationRow[] = [
      { entity_id: "1", value: "Athlète" },
      { entity_id: "2", value: "Chanceux" },
    ];
    const map = buildTranslationMap(rows);
    expect(map.get("1")).toBe("Athlète");
    expect(map.get("2")).toBe("Chanceux");
    expect(map.size).toBe(2);
  });
});

describe("formatPrerequisiteText", () => {
  it("extrait le texte du prérequis quand il est présent", () => {
    expect(formatPrerequisiteText({ text: "Force 13 ou plus" })).toBe("Force 13 ou plus");
  });

  it("nettoie les espaces superflus", () => {
    expect(formatPrerequisiteText({ text: "  Dextérité 13 ou plus  " })).toBe("Dextérité 13 ou plus");
  });

  it("renvoie null quand la clé text est absente, null, ou vide", () => {
    expect(formatPrerequisiteText({})).toBeNull();
    expect(formatPrerequisiteText({ text: null })).toBeNull();
    expect(formatPrerequisiteText({ text: "" })).toBeNull();
    expect(formatPrerequisiteText({ text: "   " })).toBeNull();
  });

  it("renvoie null quand prerequisites lui-même est null ou absent", () => {
    expect(formatPrerequisiteText(null)).toBeNull();
    expect(formatPrerequisiteText(undefined as unknown as FeatRow["prerequisites"])).toBeNull();
  });
});

describe("mergeFeatListItems", () => {
  const featRows: FeatRow[] = [
    { id: 1, prerequisites: { text: "Force 13 ou plus" } },
    { id: 2, prerequisites: {} },
  ];

  it("associe chaque don à son nom via entity_id === String(feat.id), et extrait le prérequis", () => {
    const nameRows: TranslationRow[] = [
      { entity_id: "1", value: "Athlète" },
      { entity_id: "2", value: "Chanceux" },
    ];

    const result = mergeFeatListItems(featRows, nameRows);

    expect(result).toEqual([
      { id: 1, name: "Athlète", prerequisiteText: "Force 13 ou plus" },
      { id: 2, name: "Chanceux", prerequisiteText: null },
    ]);
  });

  it("ne fait pas planter la fusion quand une traduction manque, et signale la lacune", () => {
    const result = mergeFeatListItems(featRows, [{ entity_id: "1", value: "Athlète" }]);

    expect(result[0].name).toBe("Athlète");
    expect(result[1].name).toBe("(nom manquant)");
  });
});

describe("mergeFeatDetail", () => {
  const featRow: FeatRow = { id: 5, prerequisites: { text: "Force 13 ou plus" } };

  it("fusionne le don avec son nom, sa description et son prérequis", () => {
    const nameRows: TranslationRow[] = [{ entity_id: "5", value: "Athlète" }];
    const descriptionRows: TranslationRow[] = [
      { entity_id: "5", value: "Vous améliorez vos capacités athlétiques." },
    ];

    const result = mergeFeatDetail(featRow, nameRows, descriptionRows);

    expect(result).toEqual({
      id: 5,
      name: "Athlète",
      prerequisiteText: "Force 13 ou plus",
      description: "Vous améliorez vos capacités athlétiques.",
    });
  });

  it("retombe sur des valeurs par défaut lisibles quand des champs optionnels sont absents", () => {
    const noPrereqRow: FeatRow = { id: 6, prerequisites: {} };

    const result = mergeFeatDetail(noPrereqRow, [], []);

    expect(result.name).toBe("(nom manquant)");
    expect(result.prerequisiteText).toBeNull();
    expect(result.description).toBe("(non renseigné)");
  });
});
