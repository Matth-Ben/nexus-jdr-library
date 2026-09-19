import { describe, expect, it } from "vitest";
import { renderPayload, TYPE_LABELS } from "./format";

const rowsOf = (type: "race" | "class", payload: unknown) =>
  Object.fromEntries(renderPayload(type, payload).rows.map((row) => [row.label, row.value]));

describe("TYPE_LABELS", () => {
  it("nomme les nouveaux types", () => {
    expect(TYPE_LABELS.race).toBe("Race");
    expect(TYPE_LABELS.class).toBe("Classe");
  });
});

describe("renderPayload — race", () => {
  const RACE = {
    size: "Moyenne",
    speed: 30,
    ability_bonuses: { dex: 2, cha: 1, choice_others: { count: 2, amount: 1 } },
    languages: ["Commun", "Elfique"],
    traits: [
      { name: "Vision dans le noir", description: "Tu vois dans la pénombre." },
      { name: "Fey", description: "Ascendance féerique." },
    ],
    subraces: [
      {
        name: "Haut-elfe",
        ability_bonuses: { int: 1 },
        traits: [{ name: "Sort mineur", description: "Un tour de magie." }],
      },
      { name: "Sans rien", ability_bonuses: {}, traits: [] },
    ],
  };

  it("rend taille, vitesse (même unité que la liste des races), bonus et langues", () => {
    expect(rowsOf("race", RACE)).toEqual({
      Taille: "Moyenne",
      Vitesse: "30 m",
      "Bonus de caractéristiques": "DEX +2, CHA +1, +1 à 2 caractéristiques au choix",
      Langues: "Commun, Elfique",
    });
  });

  it("liste les traits (titre + texte) puis les sous-races repliables avec bonus et traits", () => {
    const { sections, description } = renderPayload("race", RACE);
    expect(description).toBeNull();
    expect(sections.map((s) => s.title)).toEqual(["Traits", "Sous-races"]);
    expect(sections[0].items).toEqual([
      { title: "Vision dans le noir", text: "Tu vois dans la pénombre." },
      { title: "Fey", text: "Ascendance féerique." },
    ]);
    expect(sections[1].collapsible).toBe(true);
    expect(sections[1].items[0]).toMatchObject({
      title: "Haut-elfe",
      rows: [{ label: "Bonus de caractéristiques", value: "INT +1" }],
      sections: [{ title: "Traits", items: [{ title: "Sort mineur", text: "Un tour de magie." }] }],
    });
    expect(sections[1].items[1]).toMatchObject({
      title: "Sans rien",
      rows: [{ value: "Aucun" }],
      sections: [],
    });
  });

  it("aucun bonus, aucune langue : « Aucun » / « Aucune »", () => {
    const rows = rowsOf("race", { ...RACE, ability_bonuses: {}, languages: [] });
    expect(rows["Bonus de caractéristiques"]).toBe("Aucun");
    expect(rows.Langues).toBe("Aucune");
  });

  it.each([null, undefined, 42, "texte", [], [1, 2], {}])("payload malformé %j : ne plante pas, replis lisibles", (payload) => {
    const { rows, sections } = renderPayload("race", payload);
    expect(rows).toHaveLength(4);
    expect(rows[0].value).toBe("(non renseigné)");
    expect(rows[1].value).toBe("(non renseigné)");
    expect(sections).toEqual([]);
  });

  it("ignore les mauvais types champ par champ", () => {
    const { rows, sections } = renderPayload("race", {
      size: 3,
      speed: "30",
      ability_bonuses: { str: "2", dex: 1.5, __proto__: 1, evil: 9, choice_others: "oui" },
      languages: "Commun",
      traits: [null, 3, { name: 12, description: {} }, { name: "OK" }],
      subraces: "aucune",
    });
    expect(rows.map((row) => row.value)).toEqual(["(non renseigné)", "(non renseigné)", "Aucun", "Aucune"]);
    expect(sections).toHaveLength(1);
    expect(sections[0].items.map((item) => item.title)).toEqual(["(sans nom)", "(sans nom)", "(sans nom)", "OK"]);
  });

  it("n'expose pas les clés inconnues des bonus (pas de libellé arbitraire)", () => {
    expect(rowsOf("race", { ability_bonuses: { "<b>x</b>": 3 } })["Bonus de caractéristiques"]).toBe("Aucun");
  });

  it("plafonne le nombre d'éléments rendus", () => {
    const traits = Array.from({ length: 5000 }, (_, i) => ({ name: `T${i}`, description: "d" }));
    expect(renderPayload("race", { traits }).sections[0].items.length).toBeLessThanOrEqual(100);
  });

  it("conserve le texte utilisateur tel quel (l'échappement est fait par React)", () => {
    const { sections } = renderPayload("race", { traits: [{ name: "<img src=x onerror=alert(1)>", description: "<b>x</b>" }] });
    expect(sections[0].items[0]).toEqual({ title: "<img src=x onerror=alert(1)>", text: "<b>x</b>" });
  });
});

describe("renderPayload — classe", () => {
  const CLASS = {
    description: "Un guerrier des runes.",
    hit_die: 10,
    primary_abilities: ["str", "con"],
    saving_throw_proficiencies: ["str", "con"],
    armor_proficiencies: ["légères", "intermédiaires"],
    weapon_proficiencies: ["courantes"],
    tool_proficiencies: [],
    skill_choices: { count: 2, choices: ["Athlétisme", "Histoire"] },
    features: [
      { level: 5, name: "Attaque supplémentaire", description: "Deux attaques." },
      { level: 1, name: "Second souffle", description: "Tu récupères." },
      { level: 1, name: "Style de combat", description: "Un style." },
      { level: 20, name: "Maître", description: "Fin." },
    ],
    subclasses: [
      { name: "Voie B", available_from_level: 7, description: "b" },
      { name: "Voie A", available_from_level: 3, description: "a" },
    ],
  };

  it("rend dé de vie, caractéristiques en français, maîtrises et compétences", () => {
    expect(rowsOf("class", CLASS)).toEqual({
      "Dé de vie": "d10",
      "Caractéristiques principales": "Force, Constitution",
      "Jets de sauvegarde": "Force, Constitution",
      Armures: "légères, intermédiaires",
      Armes: "courantes",
      Outils: "Aucune",
      Compétences: "Choisissez 2 compétences parmi : Athlétisme, Histoire",
    });
    expect(renderPayload("class", CLASS).description).toBe("Un guerrier des runes.");
  });

  it("choix « toutes »", () => {
    expect(rowsOf("class", { ...CLASS, skill_choices: { count: 3, choices: "toutes" } }).Compétences).toBe(
      "Choisissez 3 compétences parmi toutes les compétences",
    );
  });

  it("trie les aptitudes par niveau (ordre saisi à égalité) avec l'intertitre du niveau", () => {
    const features = renderPayload("class", CLASS).sections[0];
    expect(features.title).toBe("Aptitudes de classe");
    expect(features.items.map((item) => [item.group, item.title])).toEqual([
      ["Niveau 1", "Second souffle"],
      ["Niveau 1", "Style de combat"],
      ["Niveau 5", "Attaque supplémentaire"],
      ["Niveau 20", "Maître"],
    ]);
  });

  it("trie les sous-classes par niveau et l'affiche", () => {
    const subclasses = renderPayload("class", CLASS).sections[1];
    expect(subclasses.items.map((item) => [item.title, item.note])).toEqual([
      ["Voie A", "Niveau 3"],
      ["Voie B", "Niveau 7"],
    ]);
  });

  it("niveau illisible : classé en fin de liste sans planter", () => {
    const { sections } = renderPayload("class", {
      features: [
        { level: "un", name: "Bizarre", description: "x" },
        { level: 2, name: "Normal", description: "y" },
      ],
    });
    expect(sections[0].items.map((item) => [item.group, item.title])).toEqual([
      ["Niveau 2", "Normal"],
      ["Niveau non précisé", "Bizarre"],
    ]);
  });

  it.each([null, undefined, 7, "x", [], {}])("payload malformé %j : replis lisibles", (payload) => {
    const rendered = renderPayload("class", payload);
    expect(rendered.description).toBeNull();
    expect(rendered.sections).toEqual([]);
    expect(rendered.rows[0].value).toBe("(non renseigné)");
    expect(rendered.rows[6].value).toBe("(non renseigné)");
  });

  it("code de caractéristique inconnu : affiché tel quel, sans crash", () => {
    expect(rowsOf("class", { primary_abilities: ["luck"] })["Caractéristiques principales"]).toBe("luck");
  });
});
