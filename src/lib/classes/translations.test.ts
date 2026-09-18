import { describe, expect, it } from "vitest";
import {
  buildTranslationMap,
  formatSkillChoices,
  formatStringList,
  formatUsesPerRest,
  mergeClassDetail,
  mergeClassFeatures,
  mergeClassListItems,
  mergeSubclassSummaries,
} from "./translations";
import type { ClassFeatureRow, ClassRow, SubclassRow, TranslationRow } from "./types";

describe("buildTranslationMap", () => {
  it("indexe les lignes translations par entity_id", () => {
    const rows: TranslationRow[] = [
      { entity_id: "1", value: "Guerrier" },
      { entity_id: "2", value: "Magicien" },
    ];
    const map = buildTranslationMap(rows);
    expect(map.get("1")).toBe("Guerrier");
    expect(map.get("2")).toBe("Magicien");
    expect(map.size).toBe(2);
  });
});

describe("formatStringList", () => {
  it("joint les valeurs avec une virgule", () => {
    expect(formatStringList(["force", "dextérité"])).toBe("force, dextérité");
  });

  it("retombe sur 'Aucune' pour une liste vide ou absente", () => {
    expect(formatStringList([])).toBe("Aucune");
    expect(formatStringList(null)).toBe("Aucune");
    expect(formatStringList(undefined)).toBe("Aucune");
  });
});

describe("formatSkillChoices", () => {
  it("formate un choix complet (count + options)", () => {
    expect(formatSkillChoices({ count: 2, options: ["Arcane", "Histoire", "Perception"] })).toBe(
      "Choisissez 2 compétences parmi : Arcane, Histoire, Perception",
    );
  });

  it("accorde correctement le singulier pour count=1", () => {
    expect(formatSkillChoices({ count: 1, options: ["Discrétion"] })).toBe(
      "Choisissez 1 compétence parmi : Discrétion",
    );
  });

  it("reste défensif quand 'options' est absent", () => {
    expect(formatSkillChoices({ count: 2 })).toBe("Choisissez 2 compétences");
  });

  it("reste défensif quand 'count' est absent", () => {
    expect(formatSkillChoices({ options: ["Arcane", "Histoire"] })).toBe(
      "Choisissez des compétences parmi : Arcane, Histoire",
    );
  });

  it("retombe sur une valeur lisible quand la colonne est vide/absente", () => {
    expect(formatSkillChoices({})).toBe("(non renseigné)");
    expect(formatSkillChoices(null)).toBe("(non renseigné)");
    expect(formatSkillChoices(undefined)).toBe("(non renseigné)");
  });
});

describe("formatUsesPerRest", () => {
  it("formate un nombre brut", () => {
    expect(formatUsesPerRest(3)).toBe("Utilisable 3 fois par repos");
  });

  it("formate un objet {count, per}", () => {
    expect(formatUsesPerRest({ count: 2, per: "repos long" })).toBe(
      "Utilisable 2 fois par repos long",
    );
  });

  it("formate un objet {count} sans 'per'", () => {
    expect(formatUsesPerRest({ count: 4 })).toBe("Utilisable 4 fois par repos");
  });

  it("renvoie null pour une valeur absente ou de forme inconnue", () => {
    expect(formatUsesPerRest(null)).toBeNull();
    expect(formatUsesPerRest(undefined)).toBeNull();
    expect(formatUsesPerRest("illimité")).toBeNull();
    expect(formatUsesPerRest({ per: "repos long" })).toBeNull();
  });
});

describe("mergeClassListItems", () => {
  const classRows: ClassRow[] = [
    {
      id: 1,
      source: "Manuel des joueurs",
      hit_die: 10,
      primary_abilities: ["force"],
      saving_throw_proficiencies: ["force", "constitution"],
      armor_proficiencies: ["légère", "intermédiaire", "lourde"],
      weapon_proficiencies: ["armes courantes"],
      tool_proficiencies: [],
      skill_choices: { count: 2, options: ["Athlétisme"] },
    },
    {
      id: 2,
      source: null,
      hit_die: 6,
      primary_abilities: ["intelligence"],
      saving_throw_proficiencies: ["intelligence", "sagesse"],
      armor_proficiencies: [],
      weapon_proficiencies: [],
      tool_proficiencies: [],
      skill_choices: {},
    },
  ];

  it("associe chaque classe à son nom via entity_id === String(class.id)", () => {
    const nameRows: TranslationRow[] = [
      { entity_id: "1", value: "Guerrier" },
      { entity_id: "2", value: "Magicien" },
    ];

    const result = mergeClassListItems(classRows, nameRows);

    expect(result).toEqual([
      { id: 1, name: "Guerrier", hitDie: 10, source: "Manuel des joueurs" },
      { id: 2, name: "Magicien", hitDie: 6, source: null },
    ]);
  });

  it("ne fait pas planter la fusion quand une traduction manque, et signale la lacune", () => {
    const result = mergeClassListItems(classRows, [{ entity_id: "1", value: "Guerrier" }]);
    expect(result[0].name).toBe("Guerrier");
    expect(result[1].name).toBe("(nom manquant)");
  });
});

describe("mergeSubclassSummaries", () => {
  it("fusionne et trie par niveau de disponibilité croissant", () => {
    const rows: SubclassRow[] = [
      { id: 10, class_id: 1, available_from_level: 3 },
      { id: 11, class_id: 1, available_from_level: 1 },
    ];
    const nameRows: TranslationRow[] = [
      { entity_id: "10", value: "Champion" },
      { entity_id: "11", value: "Maître de guerre" },
    ];

    const result = mergeSubclassSummaries(rows, nameRows);

    expect(result.map((s) => s.name)).toEqual(["Maître de guerre", "Champion"]);
    expect(result.map((s) => s.availableFromLevel)).toEqual([1, 3]);
  });
});

describe("mergeClassFeatures", () => {
  const rows: ClassFeatureRow[] = [
    { id: 100, class_id: 1, subclass_id: null, level: 5, choice_type: null, uses_per_rest: null },
    {
      id: 99,
      class_id: 1,
      subclass_id: null,
      level: 1,
      choice_type: "sous-classe",
      uses_per_rest: { count: 1, per: "repos long" },
    },
  ];
  const nameRows: TranslationRow[] = [
    { entity_id: "100", value: "Attaque supplémentaire" },
    { entity_id: "99", value: "Style de combat" },
  ];
  const descriptionRows: TranslationRow[] = [
    { entity_id: "100", value: "Vous pouvez attaquer deux fois." },
  ];

  it("trie les aptitudes par niveau croissant", () => {
    const result = mergeClassFeatures(rows, nameRows, descriptionRows);
    expect(result.map((f) => f.id)).toEqual([99, 100]);
  });

  it("fusionne name/description/choiceType/usesPerRest de façon défensive", () => {
    const result = mergeClassFeatures(rows, nameRows, descriptionRows);
    const attaqueSupp = result.find((f) => f.id === 100);
    const style = result.find((f) => f.id === 99);

    expect(attaqueSupp).toMatchObject({
      name: "Attaque supplémentaire",
      description: "Vous pouvez attaquer deux fois.",
      choiceType: null,
      usesPerRestLabel: null,
    });
    expect(style).toMatchObject({
      name: "Style de combat",
      description: "(non renseigné)",
      choiceType: "sous-classe",
      usesPerRestLabel: "Utilisable 1 fois par repos long",
    });
  });
});

describe("mergeClassDetail", () => {
  const classRow: ClassRow = {
    id: 1,
    source: "Manuel des joueurs",
    hit_die: 10,
    primary_abilities: ["force"],
    saving_throw_proficiencies: ["force", "constitution"],
    armor_proficiencies: ["légère"],
    weapon_proficiencies: ["armes courantes"],
    tool_proficiencies: [],
    skill_choices: { count: 2, options: ["Athlétisme", "Perception"] },
  };

  it("assemble une fiche complète à partir des différentes sources", () => {
    const result = mergeClassDetail(
      classRow,
      [{ entity_id: "1", value: "Guerrier" }],
      [{ entity_id: "1", value: "Un maître du combat." }],
      [{ id: 5, class_id: 1, subclass_id: null, level: 1, choice_type: null, uses_per_rest: null }],
      [{ entity_id: "5", value: "Style de combat" }],
      [{ entity_id: "5", value: "Choisissez un style." }],
      [{ id: 20, class_id: 1, available_from_level: 3 }],
      [{ entity_id: "20", value: "Champion" }],
    );

    expect(result.name).toBe("Guerrier");
    expect(result.description).toBe("Un maître du combat.");
    expect(result.skillChoicesLabel).toBe("Choisissez 2 compétences parmi : Athlétisme, Perception");
    expect(result.features).toHaveLength(1);
    expect(result.features[0].name).toBe("Style de combat");
    expect(result.subclasses).toHaveLength(1);
    expect(result.subclasses[0].name).toBe("Champion");
  });
});
