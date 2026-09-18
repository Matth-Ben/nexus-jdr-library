import { describe, expect, it } from "vitest";
import { buildTranslationMap, formatComponents, mergeSpellDetail, mergeSpellListItems } from "./translations";
import type { SpellRow, TranslationRow } from "./types";

describe("buildTranslationMap", () => {
  it("indexe les lignes translations par entity_id", () => {
    const rows: TranslationRow[] = [
      { entity_id: "1", value: "Projectile magique" },
      { entity_id: "2", value: "Boule de feu" },
    ];
    const map = buildTranslationMap(rows);
    expect(map.get("1")).toBe("Projectile magique");
    expect(map.get("2")).toBe("Boule de feu");
    expect(map.size).toBe(2);
  });
});

describe("formatComponents", () => {
  it("liste les composantes actives dans l'ordre V, S, M", () => {
    expect(formatComponents({ verbal: true, somatic: true, material: false })).toBe("V, S");
    expect(formatComponents({ verbal: true, somatic: false, material: true })).toBe("V, M");
    expect(formatComponents({ verbal: false, somatic: true, material: true })).toBe("S, M");
  });

  it("retombe sur une valeur lisible quand la colonne est absente", () => {
    expect(formatComponents(null)).toBe("(non renseigné)");
    expect(formatComponents(undefined)).toBe("(non renseigné)");
  });

  it("gère le cas (théorique) d'un sort sans aucune composante", () => {
    expect(formatComponents({ verbal: false, somatic: false, material: false })).toBe("Aucune");
  });
});

describe("mergeSpellListItems", () => {
  const spellRows: SpellRow[] = [
    {
      id: 1,
      level: 1,
      school: "Évocation",
      casting_time: "1 action",
      concentration: false,
    },
    {
      id: 2,
      level: 3,
      school: "Évocation",
      casting_time: "1 action",
      concentration: false,
    },
  ];

  it("associe chaque sort à son nom via entity_id === String(spell.id)", () => {
    const nameRows: TranslationRow[] = [
      { entity_id: "1", value: "Projectile magique" },
      { entity_id: "2", value: "Boule de feu" },
    ];

    const result = mergeSpellListItems(spellRows, nameRows);

    expect(result).toEqual([
      {
        id: 1,
        name: "Projectile magique",
        level: 1,
        school: "Évocation",
        castingTime: "1 action",
        concentration: false,
      },
      {
        id: 2,
        name: "Boule de feu",
        level: 3,
        school: "Évocation",
        castingTime: "1 action",
        concentration: false,
      },
    ]);
  });

  it("ne fait pas planter la fusion quand une traduction manque, et signale la lacune", () => {
    const result = mergeSpellListItems(spellRows, [{ entity_id: "1", value: "Projectile magique" }]);

    expect(result[0].name).toBe("Projectile magique");
    expect(result[1].name).toBe("(nom manquant)");
  });

  it("ne fait pas correspondre un entity_id d'un autre type de contenu", () => {
    // ex. entity_id="1" pour entity_type='item' ne doit jamais se retrouver
    // mélangé ici — la requête réseau filtre déjà sur entity_type='spell',
    // ce test vérifie que la fusion elle-même n'a pas besoin d'y revenir
    // (elle fait confiance aux lignes qu'on lui donne).
    const result = mergeSpellListItems(spellRows, []);
    expect(result.every((spell) => spell.name === "(nom manquant)")).toBe(true);
  });
});

describe("mergeSpellDetail", () => {
  const spellRow: SpellRow = {
    id: 5,
    level: 3,
    school: "Évocation",
    casting_time: "1 action",
    range: "45 mètres",
    components: { verbal: true, somatic: true, material: true },
    duration: "Instantanée",
    concentration: false,
  };

  it("fusionne le sort avec son nom et sa description", () => {
    const nameRows: TranslationRow[] = [{ entity_id: "5", value: "Boule de feu" }];
    const descriptionRows: TranslationRow[] = [
      { entity_id: "5", value: "Une explosion de flammes." },
    ];

    const result = mergeSpellDetail(spellRow, nameRows, descriptionRows);

    expect(result).toEqual({
      id: 5,
      name: "Boule de feu",
      level: 3,
      school: "Évocation",
      castingTime: "1 action",
      range: "45 mètres",
      components: "V, S, M",
      duration: "Instantanée",
      concentration: false,
      description: "Une explosion de flammes.",
    });
  });

  it("retombe sur des valeurs par défaut lisibles quand des champs optionnels sont absents", () => {
    const incompleteRow: SpellRow = {
      id: 6,
      level: 1,
      school: "Abjuration",
      casting_time: "1 action",
      range: null,
      components: null,
      duration: null,
      concentration: false,
    };

    const result = mergeSpellDetail(incompleteRow, [], []);

    expect(result.name).toBe("(nom manquant)");
    expect(result.range).toBe("(non renseigné)");
    expect(result.components).toBe("(non renseigné)");
    expect(result.duration).toBe("(non renseigné)");
    expect(result.description).toBe("(non renseigné)");
  });
});
