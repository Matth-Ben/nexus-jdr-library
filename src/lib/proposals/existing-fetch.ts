import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildClassContent,
  buildFeatContent,
  buildItemContent,
  buildRaceContent,
  buildSpellContent,
  type ClassFeatureInput,
  type ClassRow,
  type ExistingContent,
  type FeatRow,
  type ItemRow,
  type RaceRow,
  type SpellRow,
  type SubclassInput,
  type SubraceInput,
  type Translated,
} from "./existing";
import type { ProposalType } from "./types";

/**
 * Lecture des éléments existants (lignes BRUTES + traductions françaises) avec
 * un client Supabase fourni par l'appelant : `createSessionClient()` côté
 * serveur, un client anonyme dans le contrôle sur la base locale.
 */

const LOCALE = "fr";

/** Table de référence et `entity_type` des traductions, par type de proposition. */
const SOURCES: Record<ProposalType, { table: string; entity: string }> = {
  spell: { table: "spells", entity: "spell" },
  feat: { table: "feats", entity: "feat" },
  item: { table: "items", entity: "item" },
  race: { table: "races", entity: "race" },
  class: { table: "classes", entity: "class" },
};

export class ExistingFetchError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ExistingFetchError";
  }
}

type Client = SupabaseClient;

function fail(what: string, error: { message: string }): never {
  throw new ExistingFetchError(`Chargement impossible (${what}) : ${error.message}`, { cause: error });
}

/** Traductions `name`/`description` (fr) d'un ensemble d'entités, indexées par identifiant. */
async function fetchTranslations(
  client: Client,
  entityType: string,
  ids: readonly number[],
): Promise<Map<number, Translated>> {
  const result = new Map<number, Translated>();
  if (ids.length === 0) return result;
  const { data, error } = await client
    .from("translations")
    .select("entity_id, field_name, value")
    .eq("entity_type", entityType)
    .eq("locale", LOCALE)
    .in("field_name", ["name", "description"])
    .in("entity_id", ids.map(String));
  if (error) fail(`traductions ${entityType}`, error);
  for (const row of (data ?? []) as { entity_id: string; field_name: string; value: string }[]) {
    const id = Number(row.entity_id);
    const entry = result.get(id) ?? {};
    if (row.field_name === "name") entry.name = row.value;
    if (row.field_name === "description") entry.description = row.value;
    result.set(id, entry);
  }
  return result;
}

async function fetchRow<T>(client: Client, table: string, columns: string, id: number): Promise<T | null> {
  const { data, error } = await client.from(table).select(columns).eq("id", id).maybeSingle();
  if (error) fail(table, error);
  return (data as T | null) ?? null;
}

/**
 * Élément existant ciblé par une proposition de modification, ou `null` s'il
 * n'existe pas (ou plus). Lève `ExistingFetchError` si la base est injoignable.
 */
export async function fetchExisting(client: Client, type: ProposalType, id: number): Promise<ExistingContent | null> {
  switch (type) {
    case "spell": {
      const row = await fetchRow<SpellRow>(
        client,
        "spells",
        "level, school, casting_time, range, duration, components, concentration, ritual",
        id,
      );
      if (!row) return null;
      const tr = (await fetchTranslations(client, "spell", [id])).get(id) ?? {};
      return buildSpellContent(id, row, tr);
    }
    case "feat": {
      const row = await fetchRow<FeatRow>(client, "feats", "prerequisites", id);
      if (!row) return null;
      const tr = (await fetchTranslations(client, "feat", [id])).get(id) ?? {};
      return buildFeatContent(id, row, tr);
    }
    case "item": {
      const row = await fetchRow<ItemRow>(
        client,
        "items",
        "category, weight, cost, rarity, requires_attunement, consumable",
        id,
      );
      if (!row) return null;
      const tr = (await fetchTranslations(client, "item", [id])).get(id) ?? {};
      return buildItemContent(id, row, tr);
    }
    case "race": {
      const row = await fetchRow<RaceRow>(client, "races", "size, speed, ability_bonuses, languages, traits", id);
      if (!row) return null;
      const { data, error } = await client
        .from("subraces")
        .select("id, ability_bonuses, traits")
        .eq("race_id", id)
        .order("id", { ascending: true });
      if (error) fail("subraces", error);
      const subraces = (data ?? []) as SubraceInput[];
      const [raceTr, subraceTr] = await Promise.all([
        fetchTranslations(client, "race", [id]),
        fetchTranslations(client, "subrace", subraces.map((subrace) => subrace.id)),
      ]);
      return buildRaceContent(
        id,
        row,
        subraces.map((subrace) => ({ ...subrace, name: subraceTr.get(subrace.id)?.name })),
        raceTr.get(id) ?? {},
      );
    }
    case "class": {
      const row = await fetchRow<ClassRow>(
        client,
        "classes",
        "hit_die, primary_abilities, saving_throw_proficiencies, armor_proficiencies, weapon_proficiencies, tool_proficiencies, skill_choices",
        id,
      );
      if (!row) return null;
      const [featuresResult, subclassesResult] = await Promise.all([
        client
          .from("class_features")
          .select("id, level")
          .eq("class_id", id)
          .is("subclass_id", null)
          .order("level", { ascending: true })
          .order("id", { ascending: true }),
        client
          .from("subclasses")
          .select("id, available_from_level")
          .eq("class_id", id)
          .order("available_from_level", { ascending: true })
          .order("id", { ascending: true }),
      ]);
      if (featuresResult.error) fail("class_features", featuresResult.error);
      if (subclassesResult.error) fail("subclasses", subclassesResult.error);
      const features = (featuresResult.data ?? []) as { id: number; level: number | null }[];
      const subclasses = (subclassesResult.data ?? []) as { id: number; available_from_level: number | null }[];
      const [classTr, featureTr, subclassTr] = await Promise.all([
        fetchTranslations(client, "class", [id]),
        fetchTranslations(client, "class_feature", features.map((feature) => feature.id)),
        fetchTranslations(client, "subclass", subclasses.map((subclass) => subclass.id)),
      ]);
      const featureInputs: ClassFeatureInput[] = features.map((feature) => ({
        ...feature,
        name: featureTr.get(feature.id)?.name,
        description: featureTr.get(feature.id)?.description,
      }));
      const subclassInputs: SubclassInput[] = subclasses.map((subclass) => ({
        ...subclass,
        name: subclassTr.get(subclass.id)?.name,
        description: subclassTr.get(subclass.id)?.description,
      }));
      return buildClassContent(id, row, featureInputs, subclassInputs, classTr.get(id) ?? {});
    }
  }
}

// --- Sélecteur d'éléments existants ----------------------------------------------

/** Nombre maximal d'éléments listés par le sélecteur. */
export const PICKER_LIMIT = 50;

export interface ExistingOption {
  id: number;
  name: string;
  /** Aide au repérage : « Niveau 3 », « Arme »… */
  hint?: string;
}

export interface ExistingOptions {
  options: ExistingOption[];
  /** Nombre total d'éléments correspondant à la recherche (peut dépasser `PICKER_LIMIT`). */
  total: number;
}

/** Échappe `%`, `_` et `\` : la saisie de l'utilisateur est un texte, pas un motif. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export const SEARCH_MAX_LENGTH = 60;

/** Texte de recherche nettoyé : trimé, sans caractère de contrôle, borné. */
export function cleanSearch(raw: unknown): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, SEARCH_MAX_LENGTH);
}

/**
 * Éléments existants d'un type, filtrés par nom (recherche « contient », sans
 * tenir compte de la casse), triés par nom, au plus `PICKER_LIMIT`.
 */
export async function listExisting(client: Client, type: ProposalType, search: string): Promise<ExistingOptions> {
  const { entity, table } = SOURCES[type];
  let query = client
    .from("translations")
    .select("entity_id, value", { count: "exact" })
    .eq("entity_type", entity)
    .eq("field_name", "name")
    .eq("locale", LOCALE);
  const text = cleanSearch(search);
  if (text !== "") query = query.ilike("value", `%${escapeLike(text)}%`);
  const { data, error, count } = await query.order("value", { ascending: true }).range(0, PICKER_LIMIT - 1);
  if (error) fail(`recherche ${entity}`, error);

  const named = ((data ?? []) as { entity_id: string; value: string }[])
    .map((row) => ({ id: Number(row.entity_id), name: row.value }))
    .filter((row) => Number.isInteger(row.id) && row.id > 0);

  const hints = new Map<number, string>();
  if ((type === "spell" || type === "item") && named.length > 0) {
    const column = type === "spell" ? "level" : "category";
    const { data: hintRows, error: hintError } = await client
      .from(table)
      .select(`id, ${column}`)
      .in("id", named.map((row) => row.id));
    if (hintError) fail(table, hintError);
    for (const row of (hintRows ?? []) as unknown as Record<string, unknown>[]) {
      const value = row[column];
      if (typeof row.id === "number" && value !== null && value !== undefined) hints.set(row.id, String(value));
    }
  }

  return {
    options: named.map((row) => ({ ...row, hint: hints.get(row.id) })),
    total: count ?? named.length,
  };
}
