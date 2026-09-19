import { describe, expect, it } from "vitest";
import { validateProposal } from "./payload";
import {
  RACE_CLASS_PAYLOAD_MAX_BYTES,
  SKILLS,
  validateClass,
  validateRace,
} from "./payload-race-class";
import { jsonbTextBytes } from "./rows";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

/** Copie de l'objet sans les clés données. */
function without<T extends Record<string, string>>(fields: T, ...keys: string[]): Record<string, string> {
  return Object.fromEntries(Object.entries(fields).filter(([key]) => !keys.includes(key)));
}

const errorsOf = (result: ReturnType<typeof validateRace>) => (result.ok ? {} : result.errors);

// --- Race ----------------------------------------------------------------------

const RACE = {
  title: "Faunide",
  size: "Moyenne",
  speed: "30",
  "ability.cha": "2",
  "ability.dex": "1",
  languages: "Commun\nSylvestre",
  "traits.0.name": "Agilité",
  "traits.0.description": "Tu bondis.",
};

describe("validateRace", () => {
  it("accepte une race minimale et nettoie les clés à 0 ou vides", () => {
    const result = validateRace(form({ ...RACE, "ability.str": "0", "ability.con": "" }));
    expect(result).toEqual({
      ok: true,
      title: "Faunide",
      payload: {
        size: "Moyenne",
        speed: 30,
        ability_bonuses: { dex: 1, cha: 2 },
        languages: ["Commun", "Sylvestre"],
        traits: [{ name: "Agilité", description: "Tu bondis." }],
        subraces: [],
      },
    });
  });

  it("ordonne les bonus str, dex, con, int, wis, cha et gère les valeurs négatives", () => {
    const result = validateRace(form({ ...RACE, "ability.str": "-2", "ability.cha": "+3", "ability.dex": "" }));
    expect(result.ok && Object.keys(result.payload.ability_bonuses as object)).toEqual(["str", "cha"]);
    expect(result.ok && result.payload.ability_bonuses).toEqual({ str: -2, cha: 3 });
  });

  it("accepte « choice_others » complet et le refuse incomplet", () => {
    const ok = validateRace(form({ ...RACE, choice_count: "2", choice_amount: "1" }));
    expect(ok.ok && ok.payload.ability_bonuses).toEqual({ dex: 1, cha: 2, choice_others: { count: 2, amount: 1 } });
    expect(errorsOf(validateRace(form({ ...RACE, choice_count: "2" }))).choice_amount).toMatch(/aussi/);
    expect(errorsOf(validateRace(form({ ...RACE, choice_amount: "1" }))).choice_count).toMatch(/aussi/);
  });

  it.each([
    ["choice_count", "0"],
    ["choice_count", "7"],
    ["choice_amount", "4"],
    ["ability.str", "4"],
    ["ability.str", "-3"],
    ["ability.str", "1.5"],
    ["ability.str", "abc"],
  ])("refuse %s = %s", (name, value) => {
    const fields: Record<string, string> = { ...RACE, choice_count: "1", choice_amount: "1", [name]: value };
    expect(Object.keys(errorsOf(validateRace(form(fields))))).toContain(name);
  });

  it("borne le nom à 80 caractères et l'exige", () => {
    expect(validateRace(form({ ...RACE, title: "n".repeat(80) })).ok).toBe(true);
    expect(errorsOf(validateRace(form({ ...RACE, title: "n".repeat(81) }))).title).toBeDefined();
    expect(errorsOf(validateRace(form({ ...RACE, title: "  " }))).title).toBeDefined();
  });

  it("refuse une taille inconnue ou absente", () => {
    expect(errorsOf(validateRace(form({ ...RACE, size: "Gigantesque" }))).size).toBeDefined();
    const withoutSize = without(RACE, "size");
    expect(errorsOf(validateRace(form(withoutSize))).size).toBeDefined();
    for (const size of ["Petite", "Moyenne", "Grande"]) {
      expect(validateRace(form({ ...RACE, size })).ok).toBe(true);
    }
  });

  it.each(["", "abc", "0", "121", "30.5", "-5", "1e2"])("refuse la vitesse %j", (speed) => {
    expect(errorsOf(validateRace(form({ ...RACE, speed }))).speed).toBeDefined();
  });

  it("accepte 1 et 120 comme vitesses limites, et un nombre brut (objet)", () => {
    expect(validateRace(form({ ...RACE, speed: "1" })).ok).toBe(true);
    expect(validateRace(form({ ...RACE, speed: "120" })).ok).toBe(true);
    expect(validateRace({ ...RACE, speed: 25 }).ok).toBe(true);
    expect(errorsOf(validateRace({ ...RACE, speed: 25.5 })).speed).toBeDefined();
  });

  describe("langues", () => {
    it("ignore les lignes vides, trime, accepte les fins de ligne Windows", () => {
      const result = validateRace(form({ ...RACE, languages: "\r\n Commun \r\n\r\n  \r\nElfique\r\n" }));
      expect(result.ok && result.payload.languages).toEqual(["Commun", "Elfique"]);
    });
    it("accepte une liste vide", () => {
      const result = validateRace(form({ ...RACE, languages: "" }));
      expect(result.ok && result.payload.languages).toEqual([]);
    });
    it("borne à 10 langues de 60 caractères", () => {
      const ten = Array.from({ length: 10 }, (_, i) => `Langue ${i}`).join("\n");
      expect(validateRace(form({ ...RACE, languages: ten })).ok).toBe(true);
      expect(errorsOf(validateRace(form({ ...RACE, languages: `${ten}\nOnze` }))).languages).toMatch(/10/);
      expect(validateRace(form({ ...RACE, languages: "l".repeat(60) })).ok).toBe(true);
      expect(errorsOf(validateRace(form({ ...RACE, languages: "l".repeat(61) }))).languages).toMatch(/60/);
    });
    it("refuse les doublons sans tenir compte de la casse", () => {
      expect(errorsOf(validateRace(form({ ...RACE, languages: "Commun\ncommun" }))).languages).toMatch(/double/);
    });
  });

  describe("traits", () => {
    it("exige au moins un trait", () => {
      const noTrait = without(RACE, "traits.0.name", "traits.0.description");
      expect(errorsOf(validateRace(form(noTrait))).traits).toMatch(/au moins un trait/);
      // Une ligne entièrement vide (formulaire sans JS) équivaut à aucune ligne.
      expect(errorsOf(validateRace(form({ ...noTrait, "traits.0.name": "", "traits.0.description": " " }))).traits).toBeDefined();
    });

    it("reconstruit le tableau dans l'ordre des index, y compris avec des trous", () => {
      const result = validateRace(
        form({
          ...RACE,
          "traits.0.name": "A",
          "traits.0.description": "a",
          "traits.7.name": "C",
          "traits.7.description": "c",
          "traits.2.name": "B",
          "traits.2.description": "b",
        }),
      );
      expect(result.ok && (result.payload.traits as { name: string }[]).map((t) => t.name)).toEqual(["A", "B", "C"]);
    });

    it("ignore une ligne vide au milieu et range les erreurs par rang soumis", () => {
      const result = validateRace(
        form({
          ...RACE,
          "traits.1.name": "",
          "traits.1.description": "",
          "traits.2.name": "Sans description",
          "traits.2.description": "",
        }),
      );
      // 0 = Agilité, 1 = vide (ignorée), 2 = incomplète : l'erreur porte le rang 2.
      expect(errorsOf(result)["traits.2.description"]).toBeDefined();
      expect(errorsOf(result)["traits.1.name"]).toBeUndefined();
    });

    it("refuse un nom sans description et une description sans nom", () => {
      const noDescription = errorsOf(validateRace(form({ ...RACE, "traits.0.description": "" })));
      expect(noDescription["traits.0.description"]).toBeDefined();
      const noName = errorsOf(validateRace(form({ ...RACE, "traits.0.name": "" })));
      expect(noName["traits.0.name"]).toBeDefined();
    });

    it("borne nom (80), description (2000) et nombre (15)", () => {
      expect(validateRace(form({ ...RACE, "traits.0.name": "n".repeat(80) })).ok).toBe(true);
      expect(errorsOf(validateRace(form({ ...RACE, "traits.0.name": "n".repeat(81) })))["traits.0.name"]).toBeDefined();
      expect(validateRace(form({ ...RACE, "traits.0.description": "d".repeat(2000) })).ok).toBe(true);
      expect(
        errorsOf(validateRace(form({ ...RACE, "traits.0.description": "d".repeat(2001) })))["traits.0.description"],
      ).toBeDefined();

      const many = (count: number) => {
        const fields: Record<string, string> = { ...RACE };
        for (let i = 0; i < count; i++) {
          fields[`traits.${i}.name`] = `Trait ${i}`;
          fields[`traits.${i}.description`] = "Texte.";
        }
        return fields;
      };
      expect(validateRace(form(many(15))).ok).toBe(true);
      expect(errorsOf(validateRace(form(many(16)))).traits).toMatch(/15/);
    });

    it("refuse deux traits de même nom (casse ignorée) et signale la seconde ligne", () => {
      const result = validateRace(
        form({ ...RACE, "traits.1.name": "AGILITÉ", "traits.1.description": "Encore." }),
      );
      expect(errorsOf(result)["traits.1.name"]).toMatch(/déjà présent/);
    });

    it("refuse un index non canonique ou géant sans planter", () => {
      // « 01 » et « 99999 » ne sont pas des index acceptés : la ligne n'existe pas.
      const result = validateRace(form({ ...RACE, "traits.01.name": "X", "traits.99999.name": "Y" }));
      expect(result.ok && result.payload.traits).toHaveLength(1);
    });

    it("refuse une requête avec un nombre déraisonnable de lignes", () => {
      const fields: Record<string, string> = { ...RACE };
      for (let i = 0; i < 250; i++) fields[`traits.${i}.name`] = "";
      expect(errorsOf(validateRace(form(fields))).traits).toMatch(/Trop de lignes/);
    });
  });

  describe("sous-races", () => {
    const SUB = {
      "subraces.0.name": "Faunide des bois",
      "subraces.0.ability.wis": "1",
      "subraces.0.traits.0.name": "Discret",
      "subraces.0.traits.0.description": "Tu te fonds.",
      "subraces.1.name": "Faunide des monts",
      "subraces.1.choice_count": "1",
      "subraces.1.choice_amount": "1",
    };

    it("reconstruit sous-races, bonus et traits imbriqués", () => {
      const result = validateRace(form({ ...RACE, ...SUB }));
      expect(result.ok && result.payload.subraces).toEqual([
        {
          name: "Faunide des bois",
          ability_bonuses: { wis: 1 },
          traits: [{ name: "Discret", description: "Tu te fonds." }],
        },
        { name: "Faunide des monts", ability_bonuses: { choice_others: { count: 1, amount: 1 } }, traits: [] },
      ]);
    });

    it("ignore une sous-race entièrement vide", () => {
      const result = validateRace(form({ ...RACE, "subraces.0.name": "", "subraces.0.traits.0.name": "" }));
      expect(result.ok && result.payload.subraces).toEqual([]);
    });

    it("exige un nom dès qu'un autre champ est rempli", () => {
      const result = validateRace(form({ ...RACE, "subraces.0.ability.str": "1" }));
      expect(errorsOf(result)["subraces.0.name"]).toBeDefined();
    });

    it("signale les erreurs de trait imbriqué avec le rang de la sous-race et du trait", () => {
      const result = validateRace(
        form({ ...RACE, ...SUB, "subraces.0.traits.1.name": "Sans texte", "subraces.0.traits.1.description": "" }),
      );
      expect(errorsOf(result)["subraces.0.traits.1.description"]).toBeDefined();
    });

    it("erreur de bonus d'une sous-race", () => {
      const result = validateRace(form({ ...RACE, "subraces.0.name": "X", "subraces.0.ability.str": "9" }));
      expect(errorsOf(result)["subraces.0.ability.str"]).toBeDefined();
    });

    it("refuse deux sous-races de même nom, plus de 6 sous-races, plus de 8 traits", () => {
      const dup = validateRace(form({ ...RACE, "subraces.0.name": "A", "subraces.1.name": "a" }));
      expect(errorsOf(dup)["subraces.1.name"]).toMatch(/déjà présent/);

      const fields: Record<string, string> = { ...RACE };
      for (let i = 0; i < 7; i++) fields[`subraces.${i}.name`] = `S${i}`;
      expect(errorsOf(validateRace(form(fields))).subraces).toMatch(/6/);

      const traits: Record<string, string> = { ...RACE, "subraces.0.name": "S" };
      for (let i = 0; i < 9; i++) {
        traits[`subraces.0.traits.${i}.name`] = `T${i}`;
        traits[`subraces.0.traits.${i}.description`] = "d";
      }
      expect(errorsOf(validateRace(form(traits)))["subraces.0.traits"]).toMatch(/8/);
      delete traits["subraces.0.traits.8.name"];
      delete traits["subraces.0.traits.8.description"];
      expect(validateRace(form(traits)).ok).toBe(true);
    });

    it("un même nom de trait est accepté dans deux sous-races différentes", () => {
      const result = validateRace(
        form({
          ...RACE,
          "subraces.0.name": "A",
          "subraces.0.traits.0.name": "Vision",
          "subraces.0.traits.0.description": "x",
          "subraces.1.name": "B",
          "subraces.1.traits.0.name": "Vision",
          "subraces.1.traits.0.description": "x",
        }),
      );
      expect(result.ok).toBe(true);
    });
  });

  it("refuse un payload sérialisé trop volumineux avec un message clair (_form)", () => {
    const fields: Record<string, string> = { ...RACE };
    for (let i = 0; i < 15; i++) {
      fields[`traits.${i}.name`] = `Trait ${i}`;
      fields[`traits.${i}.description`] = "é".repeat(2000);
    }
    for (let s = 0; s < 6; s++) {
      fields[`subraces.${s}.name`] = `Sous-race ${s}`;
      for (let t = 0; t < 8; t++) {
        fields[`subraces.${s}.traits.${t}.name`] = `T${t}`;
        fields[`subraces.${s}.traits.${t}.description`] = "é".repeat(2000);
      }
    }
    const errors = errorsOf(validateRace(form(fields)));
    expect(errors._form).toMatch(/trop volumineux/);
    expect(Object.keys(errors)).toEqual(["_form"]);
  });

  it("l'existant (sort, don, objet) n'est pas affecté et le routeur connaît race et classe", () => {
    expect(validateProposal("race", form(RACE)).ok).toBe(true);
    expect(validateProposal("class", form({ title: "X" })).ok).toBe(false);
    expect(validateProposal("monster", form(RACE)).ok).toBe(false);
  });
});

// --- Classe --------------------------------------------------------------------

const CLASS = {
  title: "Chevalier-rune",
  description: "Un guerrier des runes.",
  hit_die: "10",
  "primary_abilities.str": "on",
  "saving_throw_proficiencies.str": "on",
  "saving_throw_proficiencies.con": "on",
  armor_proficiencies: "légères\nintermédiaires",
  weapon_proficiencies: "courantes",
  tool_proficiencies: "",
  skill_count: "2",
  "skill.Athlétisme": "on",
  "skill.Histoire": "on",
  "skill.Survie": "on",
};

describe("validateClass", () => {
  it("accepte une classe minimale", () => {
    expect(validateClass(form(CLASS))).toEqual({
      ok: true,
      title: "Chevalier-rune",
      payload: {
        description: "Un guerrier des runes.",
        hit_die: 10,
        primary_abilities: ["str"],
        saving_throw_proficiencies: ["str", "con"],
        armor_proficiencies: ["légères", "intermédiaires"],
        weapon_proficiencies: ["courantes"],
        tool_proficiencies: [],
        skill_choices: { count: 2, choices: ["Athlétisme", "Histoire", "Survie"] },
        features: [],
        subclasses: [],
      },
    });
  });

  it("exige description et nom, avec leurs bornes", () => {
    expect(errorsOf(validateClass(form({ ...CLASS, description: "" }))).description).toBeDefined();
    expect(validateClass(form({ ...CLASS, description: "d".repeat(5000) })).ok).toBe(true);
    expect(errorsOf(validateClass(form({ ...CLASS, description: "d".repeat(5001) }))).description).toBeDefined();
    expect(errorsOf(validateClass(form({ ...CLASS, title: "n".repeat(81) }))).title).toBeDefined();
  });

  it.each(["6", "8", "10", "12"])("accepte le dé de vie %s", (hit_die) => {
    const result = validateClass(form({ ...CLASS, hit_die }));
    expect(result.ok && result.payload.hit_die).toBe(Number(hit_die));
  });

  it.each(["", "4", "7", "20", "d8", "8.5"])("refuse le dé de vie %j", (hit_die) => {
    expect(errorsOf(validateClass(form({ ...CLASS, hit_die }))).hit_die).toBeDefined();
  });

  describe("caractéristiques", () => {
    it("principales : 1 ou 2, jamais 0 ni 3", () => {
      expect(validateClass(form({ ...CLASS, "primary_abilities.dex": "on" })).ok).toBe(true);
      const none = without(CLASS, "primary_abilities.str");
      expect(errorsOf(validateClass(form(none))).primary_abilities).toBeDefined();
      const three = { ...CLASS, "primary_abilities.dex": "on", "primary_abilities.con": "on" };
      expect(errorsOf(validateClass(form(three))).primary_abilities).toBeDefined();
    });

    it("stocke les codes en anglais dans l'ordre canonique", () => {
      const result = validateClass(form({ ...CLASS, "primary_abilities.cha": "on", "primary_abilities.dex": "on" }));
      // 3 cochées : refusé ; on vérifie plutôt l'ordre avec 2.
      expect(result.ok).toBe(false);
      const two = validateClass(
        form({ ...CLASS, "primary_abilities.str": "", "primary_abilities.cha": "on", "primary_abilities.dex": "on" }),
      );
      expect(two.ok && two.payload.primary_abilities).toEqual(["dex", "cha"]);
    });

    it("sauvegardes : exactement 2", () => {
      const one = without(CLASS, "saving_throw_proficiencies.con");
      expect(errorsOf(validateClass(form(one))).saving_throw_proficiencies).toBeDefined();
      const three = { ...CLASS, "saving_throw_proficiencies.wis": "on" };
      expect(errorsOf(validateClass(form(three))).saving_throw_proficiencies).toBeDefined();
    });

    it("accepte des booléens (objet) et refuse une valeur incohérente", () => {
      const asObject: Record<string, unknown> = { ...CLASS, "primary_abilities.str": true };
      expect(validateClass(asObject).ok).toBe(true);
      expect(errorsOf(validateClass(form({ ...CLASS, "primary_abilities.str": "peut-être" }))).primary_abilities).toBeDefined();
    });
  });

  describe("maîtrises", () => {
    it.each(["armor_proficiencies", "weapon_proficiencies", "tool_proficiencies"])("%s : bornes et doublons", (name) => {
      const fifteen = Array.from({ length: 15 }, (_, i) => `M${i}`).join("\n");
      expect(validateClass(form({ ...CLASS, [name]: fifteen })).ok).toBe(true);
      expect(errorsOf(validateClass(form({ ...CLASS, [name]: `${fifteen}\nM15` })))[name]).toMatch(/15/);
      expect(validateClass(form({ ...CLASS, [name]: "x".repeat(80) })).ok).toBe(true);
      expect(errorsOf(validateClass(form({ ...CLASS, [name]: "x".repeat(81) })))[name]).toMatch(/80/);
      expect(errorsOf(validateClass(form({ ...CLASS, [name]: "A\n\nA" })))[name]).toMatch(/double/);
    });
  });

  describe("compétences", () => {
    it("connaît exactement les 18 compétences françaises", () => {
      expect(SKILLS).toHaveLength(18);
      expect(new Set(SKILLS).size).toBe(18);
    });

    it("« toutes » l'emporte sur les cases individuelles", () => {
      const result = validateClass(form({ ...CLASS, skill_all: "on", skill_count: "3" }));
      expect(result.ok && result.payload.skill_choices).toEqual({ count: 3, choices: "toutes" });
    });

    it("« toutes » sans aucune case cochée", () => {
      const fields: Record<string, string> = { ...CLASS, skill_all: "on" };
      delete fields["skill.Athlétisme"];
      delete fields["skill.Histoire"];
      delete fields["skill.Survie"];
      expect(validateClass(form(fields)).ok).toBe(true);
    });

    it("exige au moins `count` choix", () => {
      const two = without(CLASS, "skill.Survie");
      expect(validateClass(form(two)).ok).toBe(true);
      const one = without(two, "skill.Histoire");
      expect(errorsOf(validateClass(form(one))).skill_choices).toMatch(/au moins 2/);
      expect(validateClass(form({ ...one, skill_count: "1" })).ok).toBe(true);
    });

    it("count 0 : liste vide ; refuse alors des cases cochées", () => {
      const none: Record<string, string> = { ...CLASS, skill_count: "0" };
      expect(errorsOf(validateClass(form(none))).skill_count).toBeDefined();
      for (const key of Object.keys(none)) if (key.startsWith("skill.")) delete none[key];
      const result = validateClass(form(none));
      expect(result.ok && result.payload.skill_choices).toEqual({ count: 0, choices: [] });
    });

    it.each(["", "-1", "7", "2.5", "x"])("refuse le nombre %j", (skill_count) => {
      expect(errorsOf(validateClass(form({ ...CLASS, skill_count }))).skill_count).toBeDefined();
    });

    it("refuse une compétence inconnue (cochée) et ignore une case décochée inconnue", () => {
      expect(errorsOf(validateClass(form({ ...CLASS, "skill.Hacking": "on" }))).skill_choices).toMatch(/inconnue/);
      expect(validateClass(form({ ...CLASS, "skill.Hacking": "" })).ok).toBe(true);
    });

    it("sensible à la graphie exacte (sans accent = inconnue)", () => {
      expect(errorsOf(validateClass(form({ ...CLASS, "skill.Athletisme": "on" }))).skill_choices).toMatch(/inconnue/);
    });
  });

  describe("aptitudes", () => {
    const FEATURE = {
      "features.0.level": "1",
      "features.0.name": "Second souffle",
      "features.0.description": "Tu récupères.",
    };

    it("reconstruit les aptitudes avec niveau entier", () => {
      const result = validateClass(form({ ...CLASS, ...FEATURE }));
      expect(result.ok && result.payload.features).toEqual([
        { level: 1, name: "Second souffle", description: "Tu récupères." },
      ]);
    });

    it("bornes de niveau 1..20", () => {
      expect(validateClass(form({ ...CLASS, ...FEATURE, "features.0.level": "20" })).ok).toBe(true);
      for (const level of ["0", "21", "1.5", "", "x"]) {
        expect(errorsOf(validateClass(form({ ...CLASS, ...FEATURE, "features.0.level": level })))["features.0.level"]).toBeDefined();
      }
    });

    it("bornes de nom (100) et de description (3000)", () => {
      expect(validateClass(form({ ...CLASS, ...FEATURE, "features.0.name": "n".repeat(100) })).ok).toBe(true);
      expect(errorsOf(validateClass(form({ ...CLASS, ...FEATURE, "features.0.name": "n".repeat(101) })))["features.0.name"]).toBeDefined();
      expect(validateClass(form({ ...CLASS, ...FEATURE, "features.0.description": "d".repeat(3000) })).ok).toBe(true);
      expect(
        errorsOf(validateClass(form({ ...CLASS, ...FEATURE, "features.0.description": "d".repeat(3001) })))["features.0.description"],
      ).toBeDefined();
    });

    it("40 au maximum ; ignore les lignes vides", () => {
      const fields = (count: number): Record<string, string> => {
        const out: Record<string, string> = { ...CLASS };
        for (let i = 0; i < count; i++) {
          out[`features.${i}.level`] = String((i % 20) + 1);
          out[`features.${i}.name`] = `Aptitude ${i}`;
          out[`features.${i}.description`] = "d";
        }
        return out;
      };
      expect(validateClass(form(fields(40))).ok).toBe(true);
      expect(errorsOf(validateClass(form(fields(41)))).features).toMatch(/40/);
      const withBlank = { ...fields(1), "features.1.level": "", "features.1.name": "", "features.1.description": "" };
      const result = validateClass(form(withBlank));
      expect(result.ok && result.payload.features).toHaveLength(1);
    });

    it("refuse un doublon niveau + nom, accepte le même nom à un autre niveau", () => {
      const dup = { ...CLASS, ...FEATURE, "features.1.level": "1", "features.1.name": "second SOUFFLE", "features.1.description": "x" };
      expect(errorsOf(validateClass(form(dup)))["features.1.name"]).toMatch(/déjà présent/);
      expect(validateClass(form({ ...dup, "features.1.level": "2" })).ok).toBe(true);
    });

    it("conserve l'ordre de saisie dans le payload (le tri est fait à l'affichage)", () => {
      const result = validateClass(
        form({
          ...CLASS,
          ...FEATURE,
          "features.1.level": "1",
          "features.1.name": "Autre",
          "features.1.description": "x",
          "features.2.level": "1",
          "features.2.name": "Encore",
          "features.2.description": "y",
        }),
      );
      expect(result.ok && (result.payload.features as { name: string }[]).map((f) => f.name)).toEqual([
        "Second souffle",
        "Autre",
        "Encore",
      ]);
    });
  });

  describe("sous-classes", () => {
    const SUB = {
      "subclasses.0.name": "Voie des runes",
      "subclasses.0.available_from_level": "3",
      "subclasses.0.description": "Des runes.",
    };

    it("reconstruit les sous-classes", () => {
      const result = validateClass(form({ ...CLASS, ...SUB }));
      expect(result.ok && result.payload.subclasses).toEqual([
        { name: "Voie des runes", available_from_level: 3, description: "Des runes." },
      ]);
    });

    it("bornes : niveau, nom 100, description 3000, 8 au maximum, doublons", () => {
      expect(errorsOf(validateClass(form({ ...CLASS, ...SUB, "subclasses.0.available_from_level": "0" })))["subclasses.0.available_from_level"]).toBeDefined();
      expect(errorsOf(validateClass(form({ ...CLASS, ...SUB, "subclasses.0.name": "n".repeat(101) })))["subclasses.0.name"]).toBeDefined();
      expect(errorsOf(validateClass(form({ ...CLASS, ...SUB, "subclasses.0.description": "d".repeat(3001) })))["subclasses.0.description"]).toBeDefined();
      expect(errorsOf(validateClass(form({ ...CLASS, ...SUB, "subclasses.0.description": "" })))["subclasses.0.description"]).toBeDefined();

      const nine: Record<string, string> = { ...CLASS };
      for (let i = 0; i < 9; i++) {
        nine[`subclasses.${i}.name`] = `S${i}`;
        nine[`subclasses.${i}.available_from_level`] = "3";
        nine[`subclasses.${i}.description`] = "d";
      }
      expect(errorsOf(validateClass(form(nine))).subclasses).toMatch(/8/);

      const dup = { ...CLASS, ...SUB, "subclasses.1.name": "voie des RUNES", "subclasses.1.available_from_level": "3", "subclasses.1.description": "d" };
      expect(errorsOf(validateClass(form(dup)))["subclasses.1.name"]).toMatch(/déjà présent/);
    });
  });

  it("refuse une classe complète mais trop volumineuse (_form seul)", () => {
    const fields: Record<string, string> = { ...CLASS, description: "d".repeat(5000) };
    for (let i = 0; i < 40; i++) {
      fields[`features.${i}.level`] = String((i % 20) + 1);
      fields[`features.${i}.name`] = `Aptitude ${i}`;
      fields[`features.${i}.description`] = "é".repeat(3000);
    }
    for (let i = 0; i < 8; i++) {
      fields[`subclasses.${i}.name`] = `Sous-classe ${i}`;
      fields[`subclasses.${i}.available_from_level`] = "3";
      fields[`subclasses.${i}.description`] = "é".repeat(3000);
    }
    const errors = errorsOf(validateClass(form(fields)));
    expect(Object.keys(errors)).toEqual(["_form"]);
    expect(errors._form).toMatch(/trop volumineux/);
  });

  it("le payload accepté ne dépasse jamais la borne de la base (taille jsonb exacte)", () => {
    const fields: Record<string, string> = { ...CLASS, description: "d".repeat(5000) };
    // 40 aptitudes de 1000 caractères : gros mais valide.
    for (let i = 0; i < 40; i++) {
      fields[`features.${i}.level`] = String((i % 20) + 1);
      fields[`features.${i}.name`] = `Aptitude ${i}`;
      fields[`features.${i}.description`] = "x".repeat(1000);
    }
    const result = validateClass(form(fields));
    expect(result.ok).toBe(true);
    if (result.ok) {
      const bytes = jsonbTextBytes(result.payload);
      expect(bytes).toBeLessThanOrEqual(RACE_CLASS_PAYLOAD_MAX_BYTES);
      expect(bytes).toBeGreaterThan(40_000);
    }
  });
});
