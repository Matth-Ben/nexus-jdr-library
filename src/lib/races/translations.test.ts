import { describe, expect, it } from "vitest";
import {
  buildTranslationMap,
  formatAbilityBonuses,
  mergeRaceDetail,
  mergeRaceListItems,
} from "./translations";
import type { RaceRow, SubraceRow, TranslationRow } from "./types";

describe("buildTranslationMap", () => {
  it("indexe les lignes translations par entity_id", () => {
    const rows: TranslationRow[] = [
      { entity_id: "1", value: "Elfe" },
      { entity_id: "2", value: "Nain" },
    ];
    const map = buildTranslationMap(rows);
    expect(map.get("1")).toBe("Elfe");
    expect(map.get("2")).toBe("Nain");
    expect(map.size).toBe(2);
  });
});

describe("formatAbilityBonuses", () => {
  it("formate un bonus unique", () => {
    expect(formatAbilityBonuses({ dex: 2 })).toBe("DEX +2");
  });

  it("formate plusieurs bonus dans l'ordre conventionnel des caractéristiques", () => {
    expect(formatAbilityBonuses({ cha: 1, str: 2 })).toBe("FOR +2, CHA +1");
  });

  it("gère choice_others sous sa forme réelle {count, amount} (demi-elfe)", () => {
    expect(formatAbilityBonuses({ cha: 2, choice_others: { count: 2, amount: 1 } })).toBe(
      "CHA +2, +1 à 2 caractéristiques au choix",
    );
    expect(formatAbilityBonuses({ choice_others: { count: 1, amount: 1 } })).toBe(
      "+1 à 1 caractéristique au choix",
    );
  });

  it("gère choice_others sous forme numérique (repli défensif)", () => {
    expect(formatAbilityBonuses({ str: 2, choice_others: 1 })).toBe("FOR +2, +1 au choix");
  });

  it("gère une clé de caractéristique inconnue sans planter", () => {
    expect(formatAbilityBonuses({ luck: 1 })).toBe("LUCK +1");
  });

  it("retombe sur une valeur lisible quand l'objet est vide, null ou undefined", () => {
    expect(formatAbilityBonuses({})).toBe("(non renseigné)");
    expect(formatAbilityBonuses(null)).toBe("(non renseigné)");
    expect(formatAbilityBonuses(undefined)).toBe("(non renseigné)");
  });
});

describe("mergeRaceListItems", () => {
  const raceRows: RaceRow[] = [
    {
      id: 1,
      source: "Manuel des joueurs",
      size: "Moyenne",
      speed: 9,
      ability_bonuses: { dex: 2 },
      traits: [],
      languages: [],
    },
    {
      id: 2,
      source: "Manuel des joueurs",
      size: "Petite",
      speed: 7,
      ability_bonuses: {},
      traits: [],
      languages: [],
    },
  ];

  it("associe chaque race à son nom via entity_id === String(race.id)", () => {
    const nameRows: TranslationRow[] = [
      { entity_id: "1", value: "Elfe" },
      { entity_id: "2", value: "Halfelin" },
    ];

    const result = mergeRaceListItems(raceRows, nameRows);

    expect(result).toEqual([
      { id: 1, name: "Elfe", size: "Moyenne", speed: 9, source: "Manuel des joueurs" },
      { id: 2, name: "Halfelin", size: "Petite", speed: 7, source: "Manuel des joueurs" },
    ]);
  });

  it("ne fait pas planter la fusion quand une traduction manque, et signale la lacune", () => {
    const result = mergeRaceListItems(raceRows, [{ entity_id: "1", value: "Elfe" }]);
    expect(result[0].name).toBe("Elfe");
    expect(result[1].name).toBe("(nom manquant)");
  });

  it("préserve les champs nullable (source/size/speed) tels quels, sans les formater", () => {
    const withNulls: RaceRow[] = [
      { id: 3, source: null, size: null, speed: null, ability_bonuses: {}, traits: [], languages: [] },
    ];
    const result = mergeRaceListItems(withNulls, []);
    expect(result[0].source).toBeNull();
    expect(result[0].size).toBeNull();
    expect(result[0].speed).toBeNull();
  });
});

describe("mergeRaceDetail", () => {
  const raceRow: RaceRow = {
    id: 1,
    source: "Manuel des joueurs",
    size: "Moyenne",
    speed: 9,
    ability_bonuses: { dex: 2 },
    traits: [{ name: "Vision dans le noir", description: "Vous voyez dans l'obscurité." }],
    languages: ["Commun", "Elfique"],
  };

  const subraceRows: SubraceRow[] = [
    { id: 10, race_id: 1, ability_bonuses: { int: 1 }, traits: [{ name: "Magie innée", description: "..." }] },
  ];

  it("fusionne la race avec son nom, ses traits, langues et sous-races", () => {
    const raceNameRows: TranslationRow[] = [{ entity_id: "1", value: "Elfe" }];
    const subraceNameRows: TranslationRow[] = [{ entity_id: "10", value: "Haut-elfe" }];

    const result = mergeRaceDetail(raceRow, subraceRows, raceNameRows, subraceNameRows);

    expect(result).toEqual({
      id: 1,
      name: "Elfe",
      size: "Moyenne",
      speed: 9,
      source: "Manuel des joueurs",
      abilityBonuses: "DEX +2",
      languages: ["Commun", "Elfique"],
      traits: [{ name: "Vision dans le noir", description: "Vous voyez dans l'obscurité." }],
      subraces: [
        {
          id: 10,
          name: "Haut-elfe",
          abilityBonuses: "INT +1",
          traits: [{ name: "Magie innée", description: "..." }],
        },
      ],
    });
  });

  it("renvoie une liste de sous-races vide quand la race n'en a pas", () => {
    const result = mergeRaceDetail(raceRow, [], [{ entity_id: "1", value: "Elfe" }], []);
    expect(result.subraces).toEqual([]);
  });

  it("retombe sur des valeurs par défaut lisibles quand des champs optionnels sont absents", () => {
    const incompleteRow: RaceRow = {
      id: 4,
      source: null,
      size: null,
      speed: null,
      ability_bonuses: {},
      traits: [],
      languages: [],
    };

    const result = mergeRaceDetail(incompleteRow, [], [], []);

    expect(result.name).toBe("(nom manquant)");
    expect(result.source).toBeNull();
    expect(result.size).toBeNull();
    expect(result.speed).toBeNull();
    expect(result.abilityBonuses).toBe("(non renseigné)");
    expect(result.languages).toEqual([]);
    expect(result.traits).toEqual([]);
  });
});
