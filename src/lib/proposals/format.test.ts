import { describe, expect, it } from "vitest";
import { authorLabel, formatProposalDate, levelLabel, renderPayload } from "./format";

const rowsOf = (type: Parameters<typeof renderPayload>[0], payload: unknown) =>
  Object.fromEntries(renderPayload(type, payload).rows.map((row) => [row.label, row.value]));

describe("authorLabel", () => {
  it("affiche Membre sans nom", () => {
    expect(authorLabel(null)).toBe("Membre");
    expect(authorLabel(undefined)).toBe("Membre");
    expect(authorLabel("   ")).toBe("Membre");
  });
  it("affiche le nom trimé", () => {
    expect(authorLabel(" Élodie ")).toBe("Élodie");
  });
});

describe("formatProposalDate", () => {
  it("formate en français", () => {
    expect(formatProposalDate("2026-09-19T10:00:00Z")).toBe("19 septembre 2026");
  });
  it("utilise le fuseau de Paris", () => {
    expect(formatProposalDate("2026-12-31T23:30:00Z")).toBe("1 janvier 2027");
  });
  it("renvoie une chaîne vide pour une date absente ou invalide", () => {
    expect(formatProposalDate(null)).toBe("");
    expect(formatProposalDate("pas une date")).toBe("");
  });
});

describe("levelLabel", () => {
  it("nomme le niveau 0 tour de magie", () => {
    expect(levelLabel(0)).toBe("Tour de magie");
    expect(levelLabel(3)).toBe("Niveau 3");
  });
});

describe("renderPayload — sort", () => {
  it("rend toutes les lignes d'un sort", () => {
    const rendered = renderPayload("spell", {
      description: "Un rayon.",
      level: 2,
      school: "Évocation",
      casting_time: "1 action",
      range: "18 mètres",
      duration: "Instantanée",
      components: { verbal: true, somatic: false, material: true },
      concentration: true,
      ritual: false,
    });
    expect(rendered.description).toBe("Un rayon.");
    expect(Object.fromEntries(rendered.rows.map((r) => [r.label, r.value]))).toEqual({
      Niveau: "Niveau 2",
      École: "Évocation",
      "Temps d'incantation": "1 action",
      Portée: "18 mètres",
      Composantes: "V, M",
      Durée: "Instantanée",
      Concentration: "Oui",
      Rituel: "Non",
    });
  });

  it("supporte un payload vide, absent ou de mauvais type sans lever d'erreur", () => {
    for (const bad of [{}, null, undefined, "texte", 42, [], [1, 2]]) {
      const rendered = renderPayload("spell", bad);
      expect(rendered.description).toBeNull();
      expect(rendered.rows.find((r) => r.label === "Niveau")?.value).toBe("(non renseigné)");
      expect(rendered.rows.find((r) => r.label === "Composantes")?.value).toBe("(non renseigné)");
    }
  });

  it("n'accepte pas un niveau hors bornes ou non entier", () => {
    expect(rowsOf("spell", { level: 12 }).Niveau).toBe("(non renseigné)");
    expect(rowsOf("spell", { level: "3" }).Niveau).toBe("(non renseigné)");
  });

  it("indique Aucune quand aucune composante n'est cochée", () => {
    expect(rowsOf("spell", { components: {} }).Composantes).toBe("Aucune");
  });
});

describe("renderPayload — don", () => {
  it("affiche le prérequis ou Aucun", () => {
    expect(rowsOf("feat", { description: "d", prerequisite: "Force 13" }).Prérequis).toBe("Force 13");
    expect(rowsOf("feat", { description: "d" }).Prérequis).toBe("Aucun");
    expect(rowsOf("feat", { prerequisite: 5 }).Prérequis).toBe("Aucun");
  });
});

describe("renderPayload — objet", () => {
  it("rend catégorie, coût, poids, rareté, lien et consommable", () => {
    const rows = rowsOf("item", {
      category: "objet_magique",
      cost: { amount: 50, currency: "po" },
      weight: 1.5,
      rarity: "tres_rare",
      requires_attunement: true,
      consumable: false,
    });
    expect(rows).toEqual({
      Catégorie: "Objet magique",
      Coût: "50 po",
      Poids: "1,5 kg",
      Rareté: "Très rare",
      "Nécessite un lien": "Oui",
      Consommable: "Non",
    });
  });

  it("omet coût, poids et rareté absents", () => {
    const rows = rowsOf("item", { category: "arme" });
    expect(Object.keys(rows)).toEqual(["Catégorie", "Nécessite un lien", "Consommable"]);
  });

  it("gère des valeurs inattendues (coût mal formé, poids négatif, rareté inconnue)", () => {
    const rows = rowsOf("item", { category: "zzz", cost: { amount: "x" }, weight: -2, rarity: "mythique" });
    expect(rows.Catégorie).toBe("zzz");
    expect(rows).not.toHaveProperty("Coût");
    expect(rows).not.toHaveProperty("Poids");
    expect(rows.Rareté).toBe("mythique");
  });

  it("ne traite pas une clé du prototype comme une rareté connue", () => {
    expect(rowsOf("item", { rarity: "constructor" }).Rareté).toBe("constructor");
  });
});
