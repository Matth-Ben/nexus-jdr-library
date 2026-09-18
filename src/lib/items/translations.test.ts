import { describe, expect, it } from "vitest";
import {
  buildTranslationMap,
  formatAcDexBonus,
  formatCategory,
  formatCost,
  formatRange,
  mergeItemDetail,
  mergeItemListItems,
} from "./translations";
import type { ArmorPropertiesRow, ItemRow, TranslationRow, WeaponPropertiesRow } from "./types";

describe("buildTranslationMap", () => {
  it("indexe les lignes translations par entity_id", () => {
    const rows: TranslationRow[] = [
      { entity_id: "1", value: "Épée longue" },
      { entity_id: "2", value: "Bouclier" },
    ];
    const map = buildTranslationMap(rows);
    expect(map.get("1")).toBe("Épée longue");
    expect(map.get("2")).toBe("Bouclier");
    expect(map.size).toBe(2);
  });
});

describe("formatCategory", () => {
  it("traduit chaque catégorie connue en libellé FR", () => {
    expect(formatCategory("arme")).toBe("Arme");
    expect(formatCategory("armure")).toBe("Armure");
    expect(formatCategory("bouclier")).toBe("Bouclier");
    expect(formatCategory("outil")).toBe("Outil");
    expect(formatCategory("equipement_general")).toBe("Équipement général");
    expect(formatCategory("objet_magique")).toBe("Objet magique");
    expect(formatCategory("monture_vehicule")).toBe("Monture/Véhicule");
  });

  it("retombe sur la valeur brute pour une catégorie non reconnue", () => {
    expect(formatCategory("categorie_inconnue")).toBe("categorie_inconnue");
  });
});

describe("formatAcDexBonus", () => {
  it("traduit chaque valeur connue en libellé FR", () => {
    expect(formatAcDexBonus("aucun")).toBe("Aucun");
    expect(formatAcDexBonus("max_2")).toBe("+2 max");
    expect(formatAcDexBonus("illimite")).toBe("Illimité");
  });

  it("retombe sur la valeur brute pour une valeur non reconnue", () => {
    expect(formatAcDexBonus("autre")).toBe("autre");
  });
});

describe("formatCost", () => {
  it("formate un coût renseigné en texte lisible", () => {
    expect(formatCost({ amount: 50, currency: "po" })).toBe("50 po");
    expect(formatCost({ amount: 2, currency: "pc" })).toBe("2 pc");
  });

  it("convertit les codes anglais réels de la base (gp) en pièces françaises", () => {
    expect(formatCost({ amount: 50, currency: "gp" })).toBe("50 po");
    expect(formatCost({ amount: 0.1, currency: "gp" })).toBe("1 pa");
    expect(formatCost({ amount: 0.5, currency: "gp" })).toBe("5 pa");
    expect(formatCost({ amount: 0.2, currency: "gp" })).toBe("2 pa");
    expect(formatCost({ amount: 0.01, currency: "gp" })).toBe("1 pc");
    expect(formatCost({ amount: 5, currency: "sp" })).toBe("5 pa");
    expect(formatCost({ amount: 15, currency: "sp" })).toBe("15 pa");
  });

  it("garde une devise inconnue telle quelle", () => {
    expect(formatCost({ amount: 3, currency: "xx" })).toBe("3 xx");
  });

  it("retombe sur une valeur lisible quand cost est null ou absent", () => {
    expect(formatCost(null)).toBe("(non renseigné)");
    expect(formatCost(undefined)).toBe("(non renseigné)");
  });

  it("retombe sur une valeur lisible quand amount ou currency manque à l'intérieur de cost", () => {
    expect(formatCost({ amount: 0, currency: "" })).toBe("(non renseigné)");
  });
});

describe("formatRange", () => {
  it("formate une portée normal/max distincte", () => {
    expect(formatRange({ normal: 6, max: 18 })).toBe("6 m / 18 m");
  });

  it("n'affiche qu'une seule distance quand normal === max", () => {
    expect(formatRange({ normal: 5, max: 5 })).toBe("5 m");
  });

  it("retombe sur une valeur lisible quand range est absente", () => {
    expect(formatRange(null)).toBe("(non renseigné)");
    expect(formatRange(undefined)).toBe("(non renseigné)");
  });
});

describe("mergeItemListItems", () => {
  const itemRows: ItemRow[] = [
    {
      id: 1,
      category: "arme",
      weight: 1.5,
      cost: { amount: 15, currency: "po" },
      source: "Manuel des joueurs",
      rarity: null,
      requires_attunement: false,
      consumable: false,
    },
    {
      id: 2,
      category: "outil",
      weight: 0.5,
      cost: { amount: 2, currency: "po" },
      source: "Manuel des joueurs",
      rarity: null,
      requires_attunement: false,
      consumable: false,
    },
  ];

  it("associe chaque objet à son nom via entity_id === String(item.id)", () => {
    const nameRows: TranslationRow[] = [
      { entity_id: "1", value: "Épée longue" },
      { entity_id: "2", value: "Outils de voleur" },
    ];

    const result = mergeItemListItems(itemRows, nameRows);

    expect(result).toEqual([
      {
        id: 1,
        name: "Épée longue",
        category: "arme",
        cost: { amount: 15, currency: "po" },
        weight: 1.5,
      },
      {
        id: 2,
        name: "Outils de voleur",
        category: "outil",
        cost: { amount: 2, currency: "po" },
        weight: 0.5,
      },
    ]);
  });

  it("ne fait pas planter la fusion quand une traduction manque, et signale la lacune", () => {
    const result = mergeItemListItems(itemRows, [{ entity_id: "1", value: "Épée longue" }]);

    expect(result[0].name).toBe("Épée longue");
    expect(result[1].name).toBe("(nom manquant)");
  });

  it("gère un objet sans coût ni poids renseignés", () => {
    const rowWithoutCostOrWeight: ItemRow = {
      id: 3,
      category: "equipement_general",
      weight: null,
      cost: null,
      source: null,
      rarity: null,
      requires_attunement: false,
      consumable: false,
    };

    const result = mergeItemListItems([rowWithoutCostOrWeight], []);

    expect(result[0].cost).toBeNull();
    expect(result[0].weight).toBeNull();
  });
});

describe("mergeItemDetail", () => {
  const itemRow: ItemRow = {
    id: 5,
    category: "arme",
    weight: 1.5,
    cost: { amount: 15, currency: "po" },
    source: "Manuel des joueurs",
    rarity: null,
    requires_attunement: false,
    consumable: false,
  };

  it("fusionne l'objet avec son nom, sa description et ses propriétés d'arme", () => {
    const nameRows: TranslationRow[] = [{ entity_id: "5", value: "Épée longue" }];
    const descriptionRows: TranslationRow[] = [
      { entity_id: "5", value: "Une épée à une main polyvalente." },
    ];
    const weaponProperties: WeaponPropertiesRow = {
      item_id: 5,
      damage_dice: "1d8",
      damage_type: "tranchant",
      properties: ["polyvalent"],
      range: null,
    };

    const result = mergeItemDetail(itemRow, nameRows, descriptionRows, weaponProperties, null);

    expect(result).toEqual({
      id: 5,
      name: "Épée longue",
      category: "arme",
      cost: { amount: 15, currency: "po" },
      weight: 1.5,
      description: "Une épée à une main polyvalente.",
      source: "Manuel des joueurs",
      rarity: null,
      requiresAttunement: false,
      consumable: false,
      weaponProperties,
      armorProperties: null,
    });
  });

  it("fusionne un objet d'armure avec ses propriétés d'armure", () => {
    const armorRow: ItemRow = {
      id: 6,
      category: "armure",
      weight: 10,
      cost: { amount: 50, currency: "po" },
      source: "Manuel des joueurs",
      rarity: null,
      requires_attunement: false,
      consumable: false,
    };
    const armorProperties: ArmorPropertiesRow = {
      item_id: 6,
      ac_base: 14,
      ac_dex_bonus: "max_2",
      strength_requirement: null,
      stealth_disadvantage: false,
    };

    const result = mergeItemDetail(armorRow, [], [], null, armorProperties);

    expect(result.armorProperties).toEqual(armorProperties);
    expect(result.weaponProperties).toBeNull();
  });

  it("retombe sur des valeurs par défaut lisibles quand des champs optionnels sont absents", () => {
    const incompleteRow: ItemRow = {
      id: 7,
      category: "equipement_general",
      weight: null,
      cost: null,
      source: null,
      rarity: null,
      requires_attunement: false,
      consumable: false,
    };

    const result = mergeItemDetail(incompleteRow, [], [], null, null);

    expect(result.name).toBe("(nom manquant)");
    expect(result.description).toBe("(non renseigné)");
    expect(result.source).toBeNull();
    expect(result.rarity).toBeNull();
    expect(result.weaponProperties).toBeNull();
    expect(result.armorProperties).toBeNull();
  });
});
