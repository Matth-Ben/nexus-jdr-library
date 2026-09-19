import { describe, expect, it } from "vitest";
import { annotateSections, diffContent } from "./diff";
import { renderPayload } from "./format";

const SPELL = {
  description: "Une explosion de flammes.",
  level: 3,
  school: "Évocation",
  casting_time: "1 action",
  range: "45 mètres",
  duration: "Instantanée",
  components: { verbal: true, somatic: true, material: false },
  concentration: false,
  ritual: false,
};

const before = <T extends Record<string, unknown>>(payload: T, title = "Boule de feu") => ({ title, payload });

describe("diffContent — champs simples", () => {
  it("ne signale rien pour un contenu identique", () => {
    const diff = diffContent("spell", before(SPELL), before(SPELL));
    expect(diff.hasChanges).toBe(false);
    expect(diff.scalars).toEqual([]);
    expect(diff.lists).toEqual([]);
    expect(diff.changedRows).toEqual([]);
  });

  it("montre « avant → après » pour chaque champ modifié, formaté comme l'affichage", () => {
    const diff = diffContent(
      "spell",
      before(SPELL),
      before({ ...SPELL, level: 4, duration: "1 minute", concentration: true, components: { verbal: true, somatic: false, material: true } }),
    );
    expect(diff.scalars).toEqual([
      { label: "Niveau", before: "Niveau 3", after: "Niveau 4" },
      { label: "Composantes", before: "V, S", after: "V, M" },
      { label: "Durée", before: "Instantanée", after: "1 minute" },
      { label: "Concentration", before: "Non", after: "Oui" },
    ]);
    expect(diff.changedRows).toEqual(["Niveau", "Composantes", "Durée", "Concentration"]);
    expect(diff.hasChanges).toBe(true);
  });

  it("signale un renommage (Titre pour un sort, Nom pour une race)", () => {
    expect(diffContent("spell", before(SPELL), before(SPELL, "Sphère de feu")).scalars).toEqual([
      { label: "Titre", before: "Boule de feu", after: "Sphère de feu" },
    ]);
    expect(diffContent("race", before({}, "Elfe"), before({}, "Elfe noir")).scalars[0]).toEqual({
      label: "Nom",
      before: "Elfe",
      after: "Elfe noir",
    });
  });

  it("résume une description modifiée comme texte long", () => {
    const diff = diffContent("spell", before(SPELL), before({ ...SPELL, description: "Une sphère de feu." }));
    expect(diff.descriptionChanged).toBe(true);
    expect(diff.texts).toEqual([
      { label: "Description", before: "Une explosion de flammes.", after: "Une sphère de feu." },
    ]);
    expect(diff.scalars).toEqual([]);
  });

  it("don : ajout, changement et retrait du prérequis", () => {
    const feat = { description: "Fort." };
    expect(diffContent("feat", before(feat), before({ ...feat, prerequisite: "Force 13" })).scalars).toEqual([
      { label: "Prérequis", before: "Aucun", after: "Force 13" },
    ]);
    expect(diffContent("feat", before({ ...feat, prerequisite: "Force 13" }), before(feat)).scalars).toEqual([
      { label: "Prérequis", before: "Force 13", after: "Aucun" },
    ]);
  });

  it("objet : coût fractionnaire converti, apparition d'une ligne", () => {
    const item = { description: "Un bâton.", category: "arme", requires_attunement: false, consumable: false };
    const diff = diffContent(
      "item",
      before({ ...item, cost: { amount: 1, currency: "pa" } }),
      before({ ...item, cost: { amount: 2, currency: "po" }, weight: 1.5, rarity: "rare" }),
    );
    expect(diff.scalars).toEqual([
      { label: "Coût", before: "1 pa", after: "2 po" },
      { label: "Poids", before: "", after: "1,5 kg" },
      { label: "Rareté", before: "", after: "Rare" },
    ]);
  });
});

describe("diffContent — listes", () => {
  const RACE = {
    size: "Moyenne",
    speed: 9,
    ability_bonuses: { dex: 2 },
    languages: ["Commun", "Elfique"],
    traits: [
      { name: "Vision", description: "Tu vois dans le noir." },
      { name: "Transe", description: "Tu ne dors pas." },
    ],
    subraces: [
      { name: "Haut-elfe", ability_bonuses: { int: 1 }, traits: [{ name: "Sort mineur", description: "Un tour." }] },
      { name: "Elfe des bois", ability_bonuses: { wis: 1 }, traits: [] },
    ],
  };

  it("langues : éléments ajoutés et retirés, insensibles à la casse et à l'ordre", () => {
    const diff = diffContent(
      "race",
      before(RACE, "Elfe"),
      before({ ...RACE, languages: ["elfique", "Nain", "Commun"] }, "Elfe"),
    );
    expect(diff.lists).toEqual([{ label: "Langues", added: ["Nain"], removed: [], changed: [] }]);
    expect(diff.changedRows).toEqual(["Langues"]);
    expect(diff.scalars).toEqual([]);
  });

  it("langues : simple réordonnancement = ligne marquée, sans résumé de liste", () => {
    const diff = diffContent("race", before(RACE, "Elfe"), before({ ...RACE, languages: ["Elfique", "Commun"] }, "Elfe"));
    expect(diff.lists).toEqual([]);
    expect(diff.scalars).toEqual([{ label: "Langues", before: "Commun, Elfique", after: "Elfique, Commun" }]);
  });

  it("traits : ajouté, retiré et modifié, par nom", () => {
    const diff = diffContent(
      "race",
      before(RACE, "Elfe"),
      before(
        {
          ...RACE,
          traits: [
            { name: "Vision", description: "Tu vois très bien dans le noir." },
            { name: "Sens aiguisés", description: "Perception." },
          ],
        },
        "Elfe",
      ),
    );
    expect(diff.lists).toEqual([
      { label: "Traits", added: ["Sens aiguisés"], removed: ["Transe"], changed: ["Vision"] },
    ]);
    expect(diff.marks).toEqual({ Traits: { Vision: "modified", "Sens aiguisés": "added" } });
  });

  it("sous-races : ajout, retrait et modification imbriquée (un trait de la sous-race)", () => {
    const diff = diffContent(
      "race",
      before(RACE, "Elfe"),
      before(
        {
          ...RACE,
          subraces: [
            {
              name: "Haut-elfe",
              ability_bonuses: { int: 1 },
              traits: [{ name: "Sort mineur", description: "Un tour de magie." }],
            },
            { name: "Drow", ability_bonuses: { cha: 1 }, traits: [] },
          ],
        },
        "Elfe",
      ),
    );
    expect(diff.lists).toEqual([
      { label: "Sous-races", added: ["Drow"], removed: ["Elfe des bois"], changed: ["Haut-elfe"] },
    ]);
  });

  it("classe : maîtrises et caractéristiques comparées élément par élément", () => {
    const klass = {
      description: "Un guerrier.",
      hit_die: 10,
      primary_abilities: ["str"],
      saving_throw_proficiencies: ["str", "con"],
      armor_proficiencies: ["armures légères", "armures lourdes"],
      weapon_proficiencies: ["armes courantes"],
      tool_proficiencies: [],
      skill_choices: { count: 2, choices: ["Athlétisme", "Perception"] },
      features: [{ level: 1, name: "Second souffle", description: "Des PV." }],
      subclasses: [],
    };
    const diff = diffContent(
      "class",
      before(klass, "Guerrier"),
      before(
        {
          ...klass,
          hit_die: 12,
          primary_abilities: ["str", "dex"],
          armor_proficiencies: ["armures légères"],
          tool_proficiencies: ["outils de forgeron"],
          skill_choices: { count: 3, choices: ["Athlétisme", "Perception", "Survie"] },
        },
        "Guerrier",
      ),
    );
    expect(diff.lists).toEqual([
      { label: "Caractéristiques principales", added: ["Dextérité"], removed: [], changed: [] },
      { label: "Armures", added: [], removed: ["armures lourdes"], changed: [] },
      { label: "Outils", added: ["outils de forgeron"], removed: [], changed: [] },
    ]);
    expect(diff.scalars.map((change) => change.label)).toEqual(["Dé de vie", "Compétences"]);
  });

  it("classe : aptitudes et sous-classes (niveau modifié = modifiée, doublon de nom géré)", () => {
    const klass = {
      description: "Un guerrier.",
      hit_die: 10,
      features: [
        { level: 1, name: "Second souffle", description: "Des PV." },
        { level: 5, name: "Attaque supplémentaire", description: "Deux attaques." },
        { level: 11, name: "Attaque supplémentaire", description: "Trois attaques." },
      ],
      subclasses: [{ name: "Champion", available_from_level: 3, description: "Critiques." }],
    };
    const diff = diffContent(
      "class",
      before(klass, "Guerrier"),
      before(
        {
          ...klass,
          features: [
            { level: 1, name: "Second souffle", description: "Des PV." },
            { level: 6, name: "Attaque supplémentaire", description: "Deux attaques." },
            { level: 11, name: "Attaque supplémentaire", description: "Trois attaques." },
            { level: 9, name: "Indomptable", description: "Relance." },
          ],
          subclasses: [],
        },
        "Guerrier",
      ),
    );
    expect(diff.lists).toEqual([
      { label: "Aptitudes de classe", added: ["Indomptable"], removed: [], changed: ["Attaque supplémentaire"] },
      { label: "Sous-classes", added: [], removed: ["Champion"], changed: [] },
    ]);
  });
});

describe("diffContent — robustesse", () => {
  it.each(["spell", "feat", "item", "race", "class"] as const)("payload malformé (%s) sans planter", (type) => {
    for (const payload of ["n'importe quoi", null, 42, [], { traits: "x", subraces: 3, features: {}, components: "?" }]) {
      const diff = diffContent(type, before({ description: "Avant." }), { title: "Titre", payload });
      expect(diff).toBeDefined();
      expect(() => annotateSections(renderPayload(type, payload).sections, diff)).not.toThrow();
    }
  });

  it("existant sans rapport avec la proposition (a changé depuis) : différences listées, pas d'erreur", () => {
    const diff = diffContent(
      "race",
      before({ size: "Grande", speed: 12, traits: [{ name: "Robuste", description: "Costaud." }] }, "Golem"),
      before({ size: "Petite", speed: 6, traits: [] }, "Golem"),
    );
    expect(diff.scalars.map((change) => change.label)).toEqual(["Taille", "Vitesse"]);
    expect(diff.lists).toEqual([{ label: "Traits", added: [], removed: ["Robuste"], changed: [] }]);
  });

  it("proposition identique à l'existant courant : aucun changement", () => {
    const diff = diffContent("spell", before(SPELL), before(SPELL));
    expect(diff.hasChanges).toBe(false);
  });
});

describe("annotateSections", () => {
  it("marque les éléments ajoutés ou modifiés et laisse les autres intacts", () => {
    const traitsBefore = [
      { name: "Vision", description: "A" },
      { name: "Transe", description: "B" },
    ];
    const traitsAfter = [
      { name: "Vision", description: "A" },
      { name: "Transe", description: "B2" },
      { name: "Nouveau", description: "C" },
    ];
    const diff = diffContent("race", before({ traits: traitsBefore }, "Elfe"), before({ traits: traitsAfter }, "Elfe"));
    const sections = annotateSections(renderPayload("race", { traits: traitsAfter }).sections, diff);
    expect(sections[0].items.map((item) => item.mark)).toEqual([undefined, "modified", "added"]);
  });
});
