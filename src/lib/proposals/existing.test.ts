import { describe, expect, it } from "vitest";
import {
  allowedSchoolsFor,
  buildClassContent,
  buildFeatContent,
  buildItemContent,
  buildRaceContent,
  buildSpellContent,
  canonicalJson,
  existingFormValues,
  isUnchanged,
  payloadToFormValues,
  TOOL_CHOICE_WARNING,
  type ExistingContent,
} from "./existing";
import { validateProposal } from "./payload";

function toFormData(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

/** Soumet les valeurs préremplies comme le ferait le navigateur, en mode modification. */
function roundTrip(existing: ExistingContent) {
  return validateProposal(existing.type, toFormData(existingFormValues(existing)), {
    modification: true,
    allowedSchools: allowedSchoolsFor(existing),
  });
}

function expectRoundTrip(existing: ExistingContent) {
  const result = roundTrip(existing);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(canonicalJson(result.payload)).toBe(canonicalJson(existing.payload));
  expect(result.title).toBe(existing.title);
  expect(isUnchanged(existing, result)).toBe(true);
}

// --- Sort ------------------------------------------------------------------------

const SPELL_ROW = {
  level: 3,
  school: "Évocation",
  casting_time: "1 action",
  range: "45 mètres",
  duration: "Instantanée",
  components: { verbal: true, somatic: true, material: false },
  concentration: false,
  ritual: false,
};

describe("buildSpellContent", () => {
  it("construit le payload d'un sort (cas nominal)", () => {
    const existing = buildSpellContent(7, SPELL_ROW, { name: "Boule de feu", description: "Une explosion." });
    expect(existing.title).toBe("Boule de feu");
    expect(existing.payload).toEqual({
      description: "Une explosion.",
      level: 3,
      school: "Évocation",
      casting_time: "1 action",
      range: "45 mètres",
      duration: "Instantanée",
      components: { verbal: true, somatic: true, material: false },
      concentration: false,
      ritual: false,
    });
    expect(existing.warnings).toEqual([]);
  });

  it("préremplit le formulaire avec les mêmes noms de champs", () => {
    const values = existingFormValues(
      buildSpellContent(
        7,
        { ...SPELL_ROW, level: 0, concentration: true, ritual: true },
        { name: "Lumière", description: "Une lueur." },
      ),
    );
    expect(values).toMatchObject({
      title: "Lumière",
      description: "Une lueur.",
      level: "0",
      school: "Évocation",
      casting_time: "1 action",
      component_verbal: "on",
      component_somatic: "on",
      concentration: "on",
      ritual: "on",
    });
    expect(values.component_material).toBeUndefined();
  });

  it("survit à un round-trip formulaire → validateur", () => {
    expectRoundTrip(buildSpellContent(7, SPELL_ROW, { name: "Boule de feu", description: "Une explosion." }));
  });

  it("school nul : école absente du payload, acceptée en modification", () => {
    const existing = buildSpellContent(1, { ...SPELL_ROW, school: null }, { name: "Mystère", description: "?" });
    expect(existing.payload).not.toHaveProperty("school");
    expect(existingFormValues(existing).school).toBe("");
    expectRoundTrip(existing);
  });

  it("school nul : le mode nouveau contenu reste strict", () => {
    const existing = buildSpellContent(1, { ...SPELL_ROW, school: null }, { name: "Mystère", description: "?" });
    const result = validateProposal("spell", toFormData(existingFormValues(existing)));
    expect(result.ok).toBe(false);
  });

  it("temps, portée et durée nuls : absents du payload, acceptés en modification", () => {
    const existing = buildSpellContent(
      1,
      { ...SPELL_ROW, casting_time: null, range: "", duration: null },
      { name: "Vide", description: "?" },
    );
    expect(existing.payload).not.toHaveProperty("casting_time");
    expect(existing.payload).not.toHaveProperty("range");
    expect(existing.payload).not.toHaveProperty("duration");
    expectRoundTrip(existing);
  });

  it("école héritée d'un ancien vocabulaire (Invocation) : acceptée pour ce sort uniquement", () => {
    const existing = buildSpellContent(1, { ...SPELL_ROW, school: "Invocation" }, { name: "Convocation", description: "?" });
    expect(allowedSchoolsFor(existing)).toEqual(["Invocation"]);
    expectRoundTrip(existing);
    const withoutAllowance = validateProposal("spell", toFormData(existingFormValues(existing)), { modification: true });
    expect(withoutAllowance.ok).toBe(false);
    const newContent = validateProposal("spell", toFormData(existingFormValues(existing)));
    expect(newContent.ok).toBe(false);
  });

  it("tolère des composantes illisibles et une traduction absente", () => {
    const existing = buildSpellContent(1, { ...SPELL_ROW, components: "n'importe quoi" }, {});
    expect(existing.title).toBe("");
    expect(existing.payload.components).toEqual({ verbal: false, somatic: false, material: false });
    expect(existing.payload.description).toBe("");
  });
});

// --- Don -------------------------------------------------------------------------

describe("buildFeatContent", () => {
  it("lit prerequisites.text", () => {
    const existing = buildFeatContent(2, { prerequisites: { text: "Force 13 ou plus" } }, { name: "Costaud", description: "Fort." });
    expect(existing.payload).toEqual({ description: "Fort.", prerequisite: "Force 13 ou plus" });
    expect(existingFormValues(existing).prerequisite).toBe("Force 13 ou plus");
    expectRoundTrip(existing);
  });

  it.each([{}, null, { text: "" }, { text: "   " }, { text: 4 }, "texte"])(
    "prérequis absent ou illisible (%j) : pas de clé prerequisite",
    (prerequisites) => {
      const existing = buildFeatContent(2, { prerequisites }, { name: "Libre", description: "Sans condition." });
      expect(existing.payload).toEqual({ description: "Sans condition." });
      expectRoundTrip(existing);
    },
  );
});

// --- Objet -----------------------------------------------------------------------

const ITEM_ROW = {
  category: "arme",
  weight: 1,
  cost: { amount: 0.1, currency: "gp" },
  rarity: null,
  requires_attunement: false,
  consumable: false,
};

describe("buildItemContent", () => {
  it("convertit un coût fractionnaire en gp vers la devise française", () => {
    const existing = buildItemContent(1, ITEM_ROW, { name: "Bâton", description: "Un bâton." });
    expect(existing.payload.cost).toEqual({ amount: 1, currency: "pa" });
    const values = existingFormValues(existing);
    expect(values.cost_amount).toBe("1");
    expect(values.cost_currency).toBe("pa");
    expectRoundTrip(existing);
  });

  it.each([
    [{ amount: 50, currency: "gp" }, { amount: 50, currency: "po" }],
    [{ amount: 0.5, currency: "gp" }, { amount: 5, currency: "pa" }],
    [{ amount: 0.01, currency: "gp" }, { amount: 1, currency: "pc" }],
    [{ amount: 0, currency: "gp" }, { amount: 0, currency: "po" }],
  ])("coût %j", (cost, expected) => {
    const existing = buildItemContent(1, { ...ITEM_ROW, cost }, { name: "X", description: "Y" });
    expect(existing.payload.cost).toEqual(expected);
    expectRoundTrip(existing);
  });

  it("coût, poids et rareté nuls : clés absentes, formulaire vide", () => {
    const existing = buildItemContent(
      1,
      { ...ITEM_ROW, cost: null, weight: null },
      { name: "Sans prix", description: "Gratuit." },
    );
    expect(existing.payload).not.toHaveProperty("cost");
    expect(existing.payload).not.toHaveProperty("weight");
    expect(existing.payload).not.toHaveProperty("rarity");
    const values = existingFormValues(existing);
    expect(values.cost_amount).toBeUndefined();
    expect(values.weight).toBeUndefined();
    expectRoundTrip(existing);
  });

  it("coût de devise inconnue ou incomplet : ignoré", () => {
    expect(buildItemContent(1, { ...ITEM_ROW, cost: { amount: 3, currency: "xx" } }, {}).payload).not.toHaveProperty("cost");
    expect(buildItemContent(1, { ...ITEM_ROW, cost: { currency: "gp" } }, {}).payload).not.toHaveProperty("cost");
    expect(buildItemContent(1, { ...ITEM_ROW, cost: "cher" }, {}).payload).not.toHaveProperty("cost");
  });

  it("poids : décimales limitées à 4, texte numérique accepté", () => {
    expect(buildItemContent(1, { ...ITEM_ROW, weight: 0.123456 }, {}).payload.weight).toBe(0.1235);
    expect(buildItemContent(1, { ...ITEM_ROW, weight: "4.5" }, {}).payload.weight).toBe(4.5);
    expect(buildItemContent(1, { ...ITEM_ROW, weight: "lourd" }, {}).payload).not.toHaveProperty("weight");
    expect(buildItemContent(1, { ...ITEM_ROW, weight: -1 }, {}).payload).not.toHaveProperty("weight");
  });

  it("description absente en base : acceptée en modification, refusée pour un nouveau contenu", () => {
    const existing = buildItemContent(1, ITEM_ROW, { name: "Muet" });
    expect(existing.payload.description).toBe("");
    expectRoundTrip(existing);
    expect(validateProposal("item", toFormData(existingFormValues(existing))).ok).toBe(false);
  });

  it("rareté, lien et consommable", () => {
    const existing = buildItemContent(
      1,
      { ...ITEM_ROW, category: "objet_magique", rarity: "rare", requires_attunement: true, consumable: true },
      { name: "Potion", description: "Boire." },
    );
    expect(existing.payload).toMatchObject({ rarity: "rare", requires_attunement: true, consumable: true });
    expectRoundTrip(existing);
  });
});

// --- Race ------------------------------------------------------------------------

const RACE_ROW = {
  size: "Moyenne",
  speed: 9,
  ability_bonuses: { dex: 2, str: 0, choice_others: { count: 2, amount: 1 }, foo: 9 },
  languages: ["Commun", " Elfique ", ""],
  traits: [
    { name: "Vision", description: "Tu vois dans le noir." },
    { name: "Transe", description: "Tu ne dors pas." },
  ],
};

describe("buildRaceContent", () => {
  const existing = buildRaceContent(
    2,
    RACE_ROW,
    [
      {
        id: 20,
        name: "Haut-elfe",
        ability_bonuses: { int: 1 },
        traits: [{ name: "Sort mineur", description: "Un tour de magie." }],
      },
      { id: 10, name: "Elfe des bois", ability_bonuses: { wis: 1 }, traits: [] },
    ],
    { name: "Elfe" },
  );

  it("normalise les bonus, les langues et ordonne les sous-races par identifiant", () => {
    expect(existing.title).toBe("Elfe");
    expect(existing.payload).toEqual({
      size: "Moyenne",
      speed: 9,
      ability_bonuses: { dex: 2, choice_others: { count: 2, amount: 1 } },
      languages: ["Commun", "Elfique"],
      traits: RACE_ROW.traits,
      subraces: [
        { name: "Elfe des bois", ability_bonuses: { wis: 1 }, traits: [] },
        {
          name: "Haut-elfe",
          ability_bonuses: { int: 1 },
          traits: [{ name: "Sort mineur", description: "Un tour de magie." }],
        },
      ],
    });
  });

  it("préremplit toutes les lignes répétables", () => {
    const values = existingFormValues(existing);
    expect(values).toMatchObject({
      title: "Elfe",
      size: "Moyenne",
      speed: "9",
      "ability.dex": "2",
      choice_count: "2",
      choice_amount: "1",
      languages: "Commun\nElfique",
      "traits.0.name": "Vision",
      "traits.1.description": "Tu ne dors pas.",
      "subraces.0.name": "Elfe des bois",
      "subraces.0.ability.wis": "1",
      "subraces.1.name": "Haut-elfe",
      "subraces.1.traits.0.name": "Sort mineur",
    });
    expect(values["ability.str"]).toBeUndefined();
    expect(values["subraces.0.traits.0.name"]).toBeUndefined();
  });

  it("survit à un round-trip formulaire → validateur", () => {
    expectRoundTrip(existing);
  });

  it("race sans trait : acceptée en modification, refusée pour un nouveau contenu", () => {
    const bare = buildRaceContent(11, { ...RACE_ROW, traits: [], ability_bonuses: {} }, [], { name: "Nue" });
    expect(bare.payload.traits).toEqual([]);
    expectRoundTrip(bare);
    expect(validateProposal("race", toFormData(existingFormValues(bare))).ok).toBe(false);
  });

  it("tolère des données illisibles sans planter", () => {
    const weird = buildRaceContent(
      1,
      { size: null, speed: null, ability_bonuses: [], languages: "Commun", traits: "aucun" },
      [{ id: 1, ability_bonuses: null, traits: 3 }],
      {},
    );
    expect(weird.payload).toMatchObject({ size: "", languages: [], traits: [] });
    expect(weird.payload.subraces).toEqual([{ name: "", ability_bonuses: {}, traits: [] }]);
    expect(() => existingFormValues(weird)).not.toThrow();
  });
});

// --- Classe ----------------------------------------------------------------------

const CLASS_ROW = {
  hit_die: 8,
  primary_abilities: ["dex", "cha", "zzz"],
  saving_throw_proficiencies: ["wis", "dex"],
  armor_proficiencies: ["armures légères"],
  weapon_proficiencies: ["armes courantes", "épées longues"],
  tool_proficiencies: ["outils de voleur"],
  skill_choices: { count: 2, choices: ["Persuasion", "Acrobaties", "Inconnue"] },
};

const FEATURES = [
  { id: 30, level: 3, name: "Sournois", description: "Un bonus." },
  { id: 10, level: 1, name: "Style de combat", description: "Un style." },
  { id: 20, level: 1, name: "Second souffle", description: "Des PV." },
];

const SUBCLASSES = [
  { id: 2, available_from_level: 3, name: "Voleur", description: "Un maître de l'ombre." },
  { id: 1, available_from_level: 3, name: "Assassin", description: null },
];

describe("buildClassContent", () => {
  const existing = buildClassContent(9, CLASS_ROW, FEATURES, SUBCLASSES, { name: "Roublard", description: "Un agile." });

  it("normalise l'ordre (caractéristiques, compétences, aptitudes par niveau puis id)", () => {
    expect(existing.payload).toMatchObject({
      hit_die: 8,
      primary_abilities: ["dex", "cha"],
      saving_throw_proficiencies: ["dex", "wis"],
      tool_proficiencies: ["outils de voleur"],
      skill_choices: { count: 2, choices: ["Acrobaties", "Persuasion"] },
    });
    expect((existing.payload.features as { name: string }[]).map((feature) => feature.name)).toEqual([
      "Style de combat",
      "Second souffle",
      "Sournois",
    ]);
    expect((existing.payload.subclasses as { name: string }[]).map((subclass) => subclass.name)).toEqual([
      "Assassin",
      "Voleur",
    ]);
    expect(existing.warnings).toEqual([]);
  });

  it("préremplit toutes les lignes répétables et les cases", () => {
    const values = existingFormValues(existing);
    expect(values).toMatchObject({
      hit_die: "8",
      "primary_abilities.dex": "on",
      "primary_abilities.cha": "on",
      "saving_throw_proficiencies.wis": "on",
      weapon_proficiencies: "armes courantes\népées longues",
      skill_count: "2",
      "skill.Acrobaties": "on",
      "skill.Persuasion": "on",
      "features.0.name": "Style de combat",
      "features.0.level": "1",
      "features.2.name": "Sournois",
      "subclasses.0.name": "Assassin",
      "subclasses.0.available_from_level": "3",
      "subclasses.0.description": "",
      "subclasses.1.description": "Un maître de l'ombre.",
    });
    expect(values.skill_all).toBeUndefined();
  });

  it("survit à un round-trip formulaire → validateur (description de sous-classe absente comprise)", () => {
    expectRoundTrip(existing);
  });

  it("sous-classe sans description : refusée pour un nouveau contenu", () => {
    expect(validateProposal("class", toFormData(existingFormValues(existing))).ok).toBe(false);
  });

  it("tool_proficiencies en objet {type, count} : converti en une ligne de texte, avec avertissement", () => {
    const bard = buildClassContent(
      2,
      { ...CLASS_ROW, tool_proficiencies: { type: "instrument", count: 3 }, skill_choices: { count: 3, choices: "toutes" } },
      [],
      [],
      { name: "Barde", description: "Un artiste." },
    );
    expect(bard.payload.tool_proficiencies).toEqual(["3 instruments de musique au choix"]);
    expect(bard.warnings).toEqual([TOOL_CHOICE_WARNING]);
    const values = existingFormValues(bard);
    expect(values.tool_proficiencies).toBe("3 instruments de musique au choix");
    expect(values.skill_all).toBe("on");
    expectRoundTrip(bard);
  });

  it("tool_proficiencies objet inconnu ou vide : type humanisé ou liste vide", () => {
    const strange = buildClassContent(
      2,
      { ...CLASS_ROW, tool_proficiencies: { type: "outils_du_bord", count: 1 } },
      [],
      [],
      { name: "X", description: "Y" },
    );
    expect(strange.payload.tool_proficiencies).toEqual(["1 outils du bord au choix"]);
    const empty = buildClassContent(2, { ...CLASS_ROW, tool_proficiencies: {} }, [], [], { name: "X", description: "Y" });
    expect(empty.payload.tool_proficiencies).toEqual([]);
    expect(empty.warnings).toEqual([]);
  });

  it("skill_choices vide ({}) : 0 compétence", () => {
    const none = buildClassContent(2, { ...CLASS_ROW, skill_choices: {} }, [], [], { name: "X", description: "Y" });
    expect(none.payload.skill_choices).toEqual({ count: 0, choices: [] });
    expect(existingFormValues(none).skill_count).toBe("0");
    expectRoundTrip(none);
  });

  it("aptitude plus longue que la borne d'un nouveau contenu (4 292 caractères) : acceptée en modification", () => {
    const long = buildClassContent(
      10,
      CLASS_ROW,
      [{ id: 1, level: 1, name: "Longue", description: "x".repeat(4292) }],
      [],
      { name: "Occultiste", description: "Un pacte." },
    );
    expectRoundTrip(long);
    expect(validateProposal("class", toFormData(existingFormValues(long))).ok).toBe(false);
  });

  it("11 sous-classes : acceptées en modification, refusées pour un nouveau contenu", () => {
    const subclasses = Array.from({ length: 11 }, (_, index) => ({
      id: index + 1,
      available_from_level: 1,
      name: `Voie ${index + 1}`,
      description: "Une voie.",
    }));
    const many = buildClassContent(11, CLASS_ROW, [], subclasses, { name: "Magicien", description: "Un érudit." });
    expectRoundTrip(many);
    expect(validateProposal("class", toFormData(existingFormValues(many))).ok).toBe(false);
  });

  it("tolère des données illisibles sans planter", () => {
    const weird = buildClassContent(
      1,
      {
        hit_die: null,
        primary_abilities: "str",
        saving_throw_proficiencies: null,
        armor_proficiencies: 4,
        weapon_proficiencies: {},
        tool_proficiencies: 12,
        skill_choices: "beaucoup",
      },
      [{ id: 1, level: null }],
      [{ id: 1, available_from_level: null }],
      {},
    );
    expect(() => existingFormValues(weird)).not.toThrow();
    expect(weird.payload.tool_proficiencies).toEqual([]);
  });
});

// --- Comparaison -----------------------------------------------------------------

describe("canonicalJson / isUnchanged", () => {
  it("ignore l'ordre des clés et les valeurs undefined", () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: undefined } })).toBe(canonicalJson({ a: { d: 2 }, b: 1 }));
  });

  it("respecte l'ordre des tableaux", () => {
    expect(canonicalJson({ a: [1, 2] })).not.toBe(canonicalJson({ a: [2, 1] }));
  });

  it("détecte un changement de titre, même à payload identique (renommage)", () => {
    const existing = buildFeatContent(1, { prerequisites: {} }, { name: "Chanceux", description: "Relance." });
    expect(isUnchanged(existing, { title: "Chanceux", payload: { description: "Relance." } })).toBe(true);
    expect(isUnchanged(existing, { title: "Veinard", payload: { description: "Relance." } })).toBe(false);
    expect(isUnchanged(existing, { title: "Chanceux", payload: { description: "Relance !" } })).toBe(false);
  });
});

describe("payloadToFormValues", () => {
  it("ne plante pas sur un payload vide", () => {
    for (const type of ["spell", "feat", "item", "race", "class"] as const) {
      expect(() => payloadToFormValues(type, "", {})).not.toThrow();
    }
  });
});

describe("sauts de ligne (un navigateur envoie « \r\n » depuis un textarea)", () => {
  it("un texte multiligne renvoyé tel quel reste identique à l'existant", () => {
    const existing = buildFeatContent(
      1,
      { prerequisites: {} },
      { name: "Long", description: "Première ligne.\nSeconde ligne.\n\nTroisième." },
    );
    const values = existingFormValues(existing);
    const crlf = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.replaceAll("\n", "\r\n")]));
    const result = validateProposal("feat", toFormData(crlf), { modification: true });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.description).toBe("Première ligne.\nSeconde ligne.\n\nTroisième.");
      expect(isUnchanged(existing, result)).toBe(true);
    }
  });

  it("une description existante en CRLF est normalisée comme la saisie", () => {
    const existing = buildFeatContent(1, { prerequisites: {} }, { name: "X", description: "a\r\nb" });
    expect(existing.payload.description).toBe("a\nb");
  });

  it("nouveau contenu : les sauts de ligne sont aussi stockés en \n", () => {
    const result = validateProposal("feat", toFormData({ title: "T", description: "a\r\nb\rc" }));
    expect(result.ok && result.payload.description).toBe("a\nb\nc");
  });
});
