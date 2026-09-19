import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { cleanSearch, escapeLike, fetchExisting, listExisting, PICKER_LIMIT, SEARCH_MAX_LENGTH } from "./existing-fetch";
import { validateClass } from "./payload-race-class";

interface Call {
  table: string;
  filters: [string, ...unknown[]][];
}

/**
 * Faux client Supabase : chaque requête est un objet chaînable qui enregistre
 * ses filtres et se résout avec la réponse fournie pour la table.
 */
function fakeClient(responses: Record<string, { data?: unknown; error?: { message: string } | null; count?: number }>) {
  const calls: Call[] = [];
  const client = {
    from(table: string) {
      const call: Call = { table, filters: [] };
      calls.push(call);
      const response = responses[table] ?? { data: [] };
      const builder: Record<string, unknown> = {};
      for (const method of ["select", "eq", "in", "is", "ilike", "order", "range", "limit"]) {
        builder[method] = (...args: unknown[]) => {
          call.filters.push([method, ...args]);
          return builder;
        };
      }
      const result = { data: response.data ?? null, error: response.error ?? null, count: response.count ?? null };
      builder.maybeSingle = () => Promise.resolve({ ...result, data: Array.isArray(result.data) ? (result.data[0] ?? null) : result.data });
      builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
      return builder;
    },
  };
  return { client: client as unknown as SupabaseClient, calls };
}

describe("escapeLike / cleanSearch", () => {
  it("échappe les jokers pour que la saisie soit un texte", () => {
    expect(escapeLike("100%_a\\b")).toBe("100\\%\\_a\\\\b");
    expect(escapeLike("boule de feu")).toBe("boule de feu");
  });

  it("nettoie la saisie : trim, contrôle, longueur, tableau", () => {
    expect(cleanSearch("  boule  ")).toBe("boule");
    expect(cleanSearch("a\u0000b\nc")).toBe("a b c");
    expect(cleanSearch(["x", "y"])).toBe("x");
    expect(cleanSearch(undefined)).toBe("");
    expect(cleanSearch(12)).toBe("");
    expect(cleanSearch("z".repeat(500))).toHaveLength(SEARCH_MAX_LENGTH);
  });
});

describe("listExisting", () => {
  const names = Array.from({ length: 3 }, (_, index) => ({ entity_id: String(index + 1), value: `Sort ${index + 1}` }));

  it("liste par nom (fr), triée, limitée, avec le niveau des sorts", async () => {
    const { client, calls } = fakeClient({
      translations: { data: names, count: 477 },
      spells: { data: [{ id: 1, level: 0 }, { id: 2, level: 3 }] },
    });
    const result = await listExisting(client, "spell", "");
    expect(result.total).toBe(477);
    expect(result.options).toEqual([
      { id: 1, name: "Sort 1", hint: "0" },
      { id: 2, name: "Sort 2", hint: "3" },
      { id: 3, name: "Sort 3", hint: undefined },
    ]);
    const translations = calls[0].filters;
    expect(translations).toContainEqual(["eq", "entity_type", "spell"]);
    expect(translations).toContainEqual(["eq", "field_name", "name"]);
    expect(translations).toContainEqual(["eq", "locale", "fr"]);
    expect(translations).toContainEqual(["range", 0, PICKER_LIMIT - 1]);
    expect(translations.some(([method]) => method === "ilike")).toBe(false);
  });

  it("recherche « contient » sans tenir compte de la casse, jokers échappés", async () => {
    const { client, calls } = fakeClient({ translations: { data: [], count: 0 } });
    await listExisting(client, "feat", "50%_x");
    expect(calls[0].filters).toContainEqual(["ilike", "value", "%50\\%\\_x%"]);
    expect(calls[0].filters).toContainEqual(["eq", "entity_type", "feat"]);
  });

  it("ne demande pas d'aide au repérage pour les races, classes et dons", async () => {
    const { client, calls } = fakeClient({ translations: { data: names, count: 3 } });
    await listExisting(client, "race", "");
    expect(calls.map((call) => call.table)).toEqual(["translations"]);
  });

  it("catégorie des objets, identifiants invalides ignorés", async () => {
    const { client } = fakeClient({
      translations: {
        data: [
          { entity_id: "5", value: "Épée" },
          { entity_id: "abc", value: "Orphelin" },
          { entity_id: "-3", value: "Négatif" },
        ],
        count: 3,
      },
      items: { data: [{ id: 5, category: "arme" }] },
    });
    const result = await listExisting(client, "item", "");
    expect(result.options).toEqual([{ id: 5, name: "Épée", hint: "arme" }]);
  });

  it("propage une erreur de la base", async () => {
    const { client } = fakeClient({ translations: { error: { message: "boom" } } });
    await expect(listExisting(client, "spell", "")).rejects.toThrow(/boom/);
  });
});

describe("fetchExisting", () => {
  it("renvoie null quand l'élément n'existe pas", async () => {
    for (const type of ["spell", "feat", "item", "race", "class"] as const) {
      const { client } = fakeClient({});
      expect(await fetchExisting(client, type, 999_999)).toBeNull();
    }
  });

  it("lit les lignes brutes puis les traductions françaises", async () => {
    const { client, calls } = fakeClient({
      feats: { data: [{ prerequisites: { text: "Force 13" } }] },
      translations: {
        data: [
          { entity_id: "4", field_name: "name", value: "Costaud" },
          { entity_id: "4", field_name: "description", value: "Fort." },
        ],
      },
    });
    const existing = await fetchExisting(client, "feat", 4);
    expect(existing).toMatchObject({
      type: "feat",
      id: 4,
      title: "Costaud",
      payload: { description: "Fort.", prerequisite: "Force 13" },
    });
    expect(calls[0]).toEqual({ table: "feats", filters: expect.arrayContaining([["eq", "id", 4]]) });
    expect(calls[1].filters).toContainEqual(["eq", "entity_type", "feat"]);
    expect(calls[1].filters).toContainEqual(["in", "entity_id", ["4"]]);
  });

  it("propage une erreur de la base (élément non confondu avec « introuvable »)", async () => {
    const { client } = fakeClient({ spells: { error: { message: "réseau" } } });
    await expect(fetchExisting(client, "spell", 1)).rejects.toThrow(/réseau/);
  });

  it("classe : aptitudes de la classe seulement (sous-classe nulle)", async () => {
    const { client, calls } = fakeClient({
      classes: { data: [{ hit_die: 8, primary_abilities: [], saving_throw_proficiencies: [], armor_proficiencies: [], weapon_proficiencies: [], tool_proficiencies: [], skill_choices: {} }] },
    });
    await fetchExisting(client, "class", 2);
    const features = calls.find((call) => call.table === "class_features");
    expect(features?.filters).toContainEqual(["eq", "class_id", 2]);
    expect(features?.filters).toContainEqual(["is", "subclass_id", null]);
  });
});

describe("bornes assouplies en modification", () => {
  const base = {
    title: "Guerrier",
    description: "Un guerrier.",
    hit_die: "10",
    "primary_abilities.str": "on",
    "saving_throw_proficiencies.str": "on",
    "saving_throw_proficiencies.con": "on",
    skill_count: "0",
  };

  it("aptitude de 5 001 caractères refusée même en modification", () => {
    const result = validateClass(
      { ...base, "features.0.level": "1", "features.0.name": "Trop", "features.0.description": "x".repeat(5001) },
      { modification: true },
    );
    expect(result.ok).toBe(false);
  });

  it("16 sous-classes refusées même en modification", () => {
    const fields: Record<string, string> = { ...base };
    for (let index = 0; index < 16; index += 1) {
      fields[`subclasses.${index}.name`] = `Voie ${index}`;
      fields[`subclasses.${index}.available_from_level`] = "3";
    }
    const result = validateClass(fields, { modification: true });
    expect(result.ok).toBe(false);
    expect(validateClass({ ...fields, "subclasses.15.name": "", "subclasses.15.available_from_level": "" }, { modification: true }).ok).toBe(true);
  });
});
