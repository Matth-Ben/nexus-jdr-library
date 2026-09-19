import { describe, expect, it } from "vitest";
import {
  COMMENT_MAX,
  DESCRIPTION_MAX,
  REASON_MAX,
  TITLE_MAX,
  validateComment,
  validateFeat,
  validateItem,
  validateProposal,
  validateReason,
  validateSpell,
  type RawInput,
} from "./payload";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const SPELL = {
  title: "Rayon de givre",
  description: "Un rayon glacé.",
  level: "2",
  school: "Évocation",
  casting_time: "1 action",
  range: "18 mètres",
  duration: "Instantanée",
  component_verbal: "on",
  component_somatic: "on",
};

function errorsOf(result: ReturnType<typeof validateSpell>) {
  if (result.ok) throw new Error("validation inattendue réussie");
  return result.errors;
}

describe("validateSpell", () => {
  it("accepte une saisie complète (FormData) et normalise le payload", () => {
    const result = validateSpell(form({ ...SPELL, title: "  Rayon de givre  ", concentration: "on" }));
    expect(result).toEqual({
      ok: true,
      title: "Rayon de givre",
      payload: {
        description: "Un rayon glacé.",
        level: 2,
        school: "Évocation",
        casting_time: "1 action",
        range: "18 mètres",
        duration: "Instantanée",
        components: { verbal: true, somatic: true, material: false },
        concentration: true,
        ritual: false,
      },
    });
  });

  it("accepte un objet brut avec components imbriqués et un niveau numérique", () => {
    const result = validateSpell({
      ...SPELL,
      level: 0,
      components: { verbal: false, somatic: false, material: true },
      ritual: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.level).toBe(0);
      expect(result.payload.components).toEqual({ verbal: false, somatic: false, material: true });
      expect(result.payload.ritual).toBe(true);
    }
  });

  it("signale tous les champs obligatoires manquants", () => {
    const errors = errorsOf(validateSpell(form({})));
    expect(Object.keys(errors).sort()).toEqual(
      ["casting_time", "description", "duration", "level", "range", "school", "title"].sort(),
    );
  });

  it("refuse les champs vides ou composés d'espaces", () => {
    const errors = errorsOf(validateSpell(form({ ...SPELL, title: "   ", range: "\n\t " })));
    expect(errors.title).toBeDefined();
    expect(errors.range).toBeDefined();
  });

  it.each(["-1", "10", "1.5", "abc", "1e1", " ", "01"])("refuse le niveau %j", (level) => {
    expect(errorsOf(validateSpell(form({ ...SPELL, level }))).level).toBeDefined();
  });

  it.each([-1, 10, 1.5, NaN, Infinity, "x", [1], {}, true])("refuse le niveau brut %j", (level) => {
    expect(errorsOf(validateSpell({ ...SPELL, level })).level).toBeDefined();
  });

  it("accepte les bornes 0 et 9 du niveau", () => {
    expect(validateSpell(form({ ...SPELL, level: "0" })).ok).toBe(true);
    expect(validateSpell(form({ ...SPELL, level: "9" })).ok).toBe(true);
  });

  it("refuse une école hors énumération (même proche)", () => {
    expect(errorsOf(validateSpell(form({ ...SPELL, school: "evocation" }))).school).toBeDefined();
    expect(errorsOf(validateSpell(form({ ...SPELL, school: "Pyromancie" }))).school).toBeDefined();
  });

  it("applique les bornes de longueur (titre 120, textes courts 60, description 5000)", () => {
    expect(validateSpell(form({ ...SPELL, title: "a".repeat(TITLE_MAX) })).ok).toBe(true);
    expect(errorsOf(validateSpell(form({ ...SPELL, title: "a".repeat(TITLE_MAX + 1) }))).title).toBeDefined();
    expect(validateSpell(form({ ...SPELL, duration: "d".repeat(60) })).ok).toBe(true);
    expect(errorsOf(validateSpell(form({ ...SPELL, duration: "d".repeat(61) }))).duration).toBeDefined();
    expect(validateSpell(form({ ...SPELL, description: "x".repeat(DESCRIPTION_MAX) })).ok).toBe(true);
    expect(
      errorsOf(validateSpell(form({ ...SPELL, description: "x".repeat(DESCRIPTION_MAX + 1) }))).description,
    ).toBeDefined();
  });

  it("compte les caractères Unicode, pas les unités UTF-16", () => {
    // 120 émojis = 240 unités UTF-16 mais 120 caractères.
    expect(validateSpell(form({ ...SPELL, title: "🔥".repeat(TITLE_MAX) })).ok).toBe(true);
  });

  it("refuse un payload dépassant la taille maximale en octets", () => {
    // 5000 émojis = 20000 octets UTF-8 : au-delà de la limite de la base.
    const errors = errorsOf(validateSpell(form({ ...SPELL, description: "🔥".repeat(5000) })));
    expect(errors.description).toMatch(/volumineux/);
  });

  it("retire les caractères NUL (refusés par Postgres)", () => {
    const result = validateSpell(form({ ...SPELL, title: "Boule" + String.fromCharCode(0) + " de feu" }));
    expect(result.ok && result.title).toBe("Boule de feu");
  });

  it("refuse des types inattendus pour un champ texte", () => {
    expect(errorsOf(validateSpell({ ...SPELL, title: 42 as unknown as string })).title).toBeDefined();
    expect(errorsOf(validateSpell({ ...SPELL, range: ["a"] as unknown as string })).range).toBeDefined();
    expect(errorsOf(validateSpell({ ...SPELL, description: { a: 1 } as unknown as string })).description).toBeDefined();
  });

  it("refuse une valeur de case invalide", () => {
    expect(errorsOf(validateSpell({ ...SPELL, ritual: "peut-être" })).ritual).toBeDefined();
    expect(errorsOf(validateSpell({ ...SPELL, components: { verbal: "??" } })).components).toBeDefined();
  });

  it("ignore les clés inconnues (pas de passage en force dans le payload)", () => {
    const result = validateSpell({ ...SPELL, status: "approved", votes_up: 99, author_id: "x" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.keys(result.payload)).not.toContain("status");
      expect(Object.keys(result.payload)).not.toContain("votes_up");
    }
  });

  it("refuse un fichier envoyé à la place d'un texte", () => {
    const data = form(SPELL);
    data.set("range", new File(["x"], "x.txt"));
    expect(errorsOf(validateSpell(data)).range).toBeDefined();
  });
});

describe("validateFeat", () => {
  it("accepte un don sans prérequis", () => {
    expect(validateFeat(form({ title: "Chanceux", description: "Relance un dé." }))).toEqual({
      ok: true,
      title: "Chanceux",
      payload: { description: "Relance un dé." },
    });
  });

  it("conserve le prérequis trimé", () => {
    const result = validateFeat(form({ title: "T", description: "D", prerequisite: "  Force 13  " }));
    expect(result.ok && result.payload.prerequisite).toBe("Force 13");
  });

  it("refuse un prérequis de plus de 200 caractères, accepte 200", () => {
    expect(validateFeat(form({ title: "T", description: "D", prerequisite: "p".repeat(200) })).ok).toBe(true);
    const result = validateFeat(form({ title: "T", description: "D", prerequisite: "p".repeat(201) }));
    expect(!result.ok && result.errors.prerequisite).toBeDefined();
  });

  it("exige titre et description", () => {
    const result = validateFeat(form({}));
    expect(!result.ok && Object.keys(result.errors).sort()).toEqual(["description", "title"]);
  });
});

describe("validateItem", () => {
  const ITEM = { title: "Épée", description: "Une épée.", category: "arme" };

  it("accepte un objet minimal", () => {
    expect(validateItem(form(ITEM))).toEqual({
      ok: true,
      title: "Épée",
      payload: { description: "Une épée.", category: "arme", requires_attunement: false, consumable: false },
    });
  });

  it("accepte coût, poids, rareté et cases", () => {
    const result = validateItem(
      form({
        ...ITEM,
        category: "objet_magique",
        cost_amount: "1,5",
        cost_currency: "pa",
        weight: "0.25",
        rarity: "tres_rare",
        requires_attunement: "on",
        consumable: "on",
      }),
    );
    expect(result).toEqual({
      ok: true,
      title: "Épée",
      payload: {
        description: "Une épée.",
        category: "objet_magique",
        cost: { amount: 1.5, currency: "pa" },
        weight: 0.25,
        rarity: "tres_rare",
        requires_attunement: true,
        consumable: true,
      },
    });
  });

  it("accepte un coût de 0 et prend po par défaut", () => {
    const result = validateItem(form({ ...ITEM, cost_amount: "0" }));
    expect(result.ok && result.payload.cost).toEqual({ amount: 0, currency: "po" });
  });

  it("ignore la devise quand aucun montant n'est saisi", () => {
    const result = validateItem(form({ ...ITEM, cost_currency: "zzz" }));
    expect(result.ok && result.payload).not.toHaveProperty("cost");
  });

  it.each(["-1", "abc", "1e3", "Infinity", "NaN", "1.2.3", "1 000", "99999999999"])("refuse le coût %j", (amount) => {
    const result = validateItem(form({ ...ITEM, cost_amount: amount }));
    expect(!result.ok && result.errors.cost_amount).toBeDefined();
  });

  it("refuse une devise inconnue", () => {
    const result = validateItem(form({ ...ITEM, cost_amount: "5", cost_currency: "gp" }));
    expect(!result.ok && result.errors.cost_currency).toBeDefined();
  });

  it.each(["-0.5", "lourd", "1e2", "100001"])("refuse le poids %j", (weight) => {
    const result = validateItem(form({ ...ITEM, weight }));
    expect(!result.ok && result.errors.weight).toBeDefined();
  });

  it("refuse une catégorie ou une rareté hors énumération", () => {
    const badCategory = validateItem(form({ ...ITEM, category: "arc" }));
    expect(!badCategory.ok && badCategory.errors.category).toBeDefined();
    const badRarity = validateItem(form({ ...ITEM, rarity: "mythique" }));
    expect(!badRarity.ok && badRarity.errors.rarity).toBeDefined();
  });

  it("exige la catégorie", () => {
    const result = validateItem(form({ title: "T", description: "D" }));
    expect(!result.ok && result.errors.category).toBeDefined();
  });

  it("accepte des nombres bruts (objet JSON)", () => {
    const result = validateItem({ ...ITEM, cost_amount: 10, weight: 2 });
    expect(result.ok && result.payload.cost).toEqual({ amount: 10, currency: "po" });
  });
});

describe("validateProposal", () => {
  it("route vers le bon validateur", () => {
    expect(validateProposal("feat", form({ title: "T", description: "D" })).ok).toBe(true);
    expect(validateProposal("spell", form({ title: "T", description: "D" })).ok).toBe(false);
  });

  it.each(["class", "", undefined, null, 3, "Spell"])("refuse le type %j", (type) => {
    const result = validateProposal(type, form({ title: "T", description: "D" }) as RawInput);
    expect(!result.ok && result.errors.content_type).toBeDefined();
  });
});

describe("validateComment / validateReason", () => {
  it("valide et trime un commentaire", () => {
    expect(validateComment("  Bien vu \n")).toEqual({ ok: true, value: "Bien vu" });
  });

  it("refuse vide, espaces, non-texte", () => {
    for (const raw of ["", "   \n", undefined, null, 5, {}]) {
      expect(validateComment(raw).ok).toBe(false);
    }
  });

  it("borne le commentaire à 2000 caractères", () => {
    expect(validateComment("c".repeat(COMMENT_MAX)).ok).toBe(true);
    expect(validateComment("c".repeat(COMMENT_MAX + 1)).ok).toBe(false);
  });

  it("motif : optionnel, borné à 500", () => {
    expect(validateReason(undefined)).toEqual({ ok: true, value: "" });
    expect(validateReason("   ")).toEqual({ ok: true, value: "" });
    expect(validateReason("r".repeat(REASON_MAX)).ok).toBe(true);
    expect(validateReason("r".repeat(REASON_MAX + 1)).ok).toBe(false);
    expect(validateReason(12).ok).toBe(false);
  });
});
