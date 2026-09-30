import { cache } from "react";
import { isClassOptionType } from "@/lib/class-options/format";
import { listClassOptionsByType } from "@/lib/class-options/queries";
import { formatChoiceType, formatUsesPerRest } from "@/lib/classes/translations";
import { formatAbilityBonuses } from "@/lib/races/translations";
import { getSupabaseClient } from "@/lib/supabase/client";
import { ReferenceFetchError, fetchAllRows, fetchTranslationMap } from "./fetch";
import {
  MISSING_TEXT,
  grantKindLabel,
  invocationPrerequisiteText,
  lineageGroupLabel,
  pactLabel,
  sortByName,
  toOptionalRef,
  toRef,
} from "./format";
import type {
  ClassFeatureRow,
  FeatureDetail,
  FeatureListItem,
  GrantedSpell,
  InvocationDetail,
  InvocationListItem,
  InvocationRow,
  LineageDetail,
  LineageListItem,
  RaceLineageRow,
  RacialInnateSpellRow,
  Ref,
  SubclassDetail,
  SubclassListItem,
  SubclassRow,
  SubclassSpellRow,
  SubraceDetail,
  SubraceListItem,
  SubraceRow,
} from "./types";

const SUBRACE_COLUMNS = "id, race_id, ability_bonuses, traits";
const SUBCLASS_COLUMNS = "id, class_id, available_from_level";
const FEATURE_COLUMNS = "id, class_id, subclass_id, level, choice_type, uses_per_rest";
const INVOCATION_COLUMNS = "id, prerequisites";
const LINEAGE_COLUMNS =
  "id, race_id, subrace_id, lineage_group, grants_ability_bonus, ability_bonuses, damage_type, resistance_damage_type, source_book";
const INNATE_SPELL_COLUMNS = "id, race_id, subrace_id, lineage_id, spell_id, character_level";

const names = (entityType: string, ids?: readonly (number | string)[]) =>
  fetchTranslationMap(entityType, "name", ids);
const descriptions = (entityType: string, ids?: readonly (number | string)[]) =>
  fetchTranslationMap(entityType, "description", ids);

function byId<T extends { id: number }>(rows: readonly T[]): Map<number, T> {
  return new Map(rows.map((row) => [row.id, row]));
}

/** Sorts innés raciaux (hors lignes sans sort résolu), triés par niveau. */
async function fetchInnateSpells(
  column: "race_id" | "subrace_id" | "lineage_id",
  id: number,
): Promise<GrantedSpell[]> {
  const rows = await fetchAllRows<RacialInnateSpellRow>(
    "racial_innate_spells",
    INNATE_SPELL_COLUMNS,
    (query) => query.eq(column, id).not("spell_id", "is", null),
  );
  const spellNames = await names(
    "spell",
    rows.map((row) => row.spell_id as number),
  );
  return rows
    .map((row) => ({
      spell: toRef(row.spell_id as number, spellNames),
      level: row.character_level,
      note: null,
    }))
    .sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
}

// ---------------------------------------------------------------------------
// Sous-races
// ---------------------------------------------------------------------------

export async function listSubraces(): Promise<SubraceListItem[]> {
  const [rows, subraceNames, raceNames] = await Promise.all([
    fetchAllRows<SubraceRow>("subraces", SUBRACE_COLUMNS),
    names("subrace"),
    names("race"),
  ]);
  return sortByName(
    rows.map((row) => ({
      ...toRef(row.id, subraceNames),
      race: toRef(row.race_id, raceNames),
      abilityBonuses: formatAbilityBonuses(row.ability_bonuses),
    })),
  );
}

export const getSubraceById = cache(async function getSubraceById(
  id: number,
): Promise<SubraceDetail | null> {
  const [row] = await fetchAllRows<SubraceRow>("subraces", SUBRACE_COLUMNS, (query) =>
    query.eq("id", id),
  );
  if (!row) {
    return null;
  }
  const [subraceNames, raceNames, lineageRows, innateSpells] = await Promise.all([
    names("subrace", [row.id]),
    names("race", [row.race_id]),
    fetchAllRows<RaceLineageRow>("race_lineages", LINEAGE_COLUMNS, (query) =>
      query.eq("subrace_id", id),
    ),
    fetchInnateSpells("subrace_id", id),
  ]);
  const lineageNames = await names(
    "race_lineage",
    lineageRows.map((lineage) => lineage.id),
  );
  return {
    ...toRef(row.id, subraceNames),
    race: toRef(row.race_id, raceNames),
    abilityBonuses: formatAbilityBonuses(row.ability_bonuses),
    traits: row.traits ?? [],
    lineages: sortByName(lineageRows.map((lineage) => toRef(lineage.id, lineageNames))),
    innateSpells,
  };
});

// ---------------------------------------------------------------------------
// Sous-classes
// ---------------------------------------------------------------------------

export async function listSubclasses(): Promise<SubclassListItem[]> {
  const [rows, subclassNames, classNames] = await Promise.all([
    fetchAllRows<SubclassRow>("subclasses", SUBCLASS_COLUMNS),
    names("subclass"),
    names("class"),
  ]);
  return sortByName(
    rows.map((row) => ({
      ...toRef(row.id, subclassNames),
      class: toRef(row.class_id, classNames),
      availableFromLevel: row.available_from_level,
    })),
  );
}

/** `subclass_spells` n'a pas de colonne `id` : lecture directe, triée par niveau. */
async function fetchSubclassSpells(subclassId: number): Promise<SubclassSpellRow[]> {
  const { data, error } = await getSupabaseClient()
    .from("subclass_spells")
    .select("subclass_id, spell_id, class_level, grant_kind")
    .eq("subclass_id", subclassId)
    .order("class_level", { ascending: true })
    .overrideTypes<SubclassSpellRow[], { merge: false }>();
  if (error) {
    throw new ReferenceFetchError(
      `Échec du chargement des sorts de la sous-classe #${subclassId} : ${error.message}`,
      { cause: error },
    );
  }
  return data ?? [];
}

export const getSubclassById = cache(async function getSubclassById(
  id: number,
): Promise<SubclassDetail | null> {
  const [row] = await fetchAllRows<SubclassRow>("subclasses", SUBCLASS_COLUMNS, (query) =>
    query.eq("id", id),
  );
  if (!row) {
    return null;
  }
  const [subclassNames, subclassDescriptions, classNames, featureRows, spellRows] =
    await Promise.all([
      names("subclass", [row.id]),
      descriptions("subclass", [row.id]),
      names("class", [row.class_id]),
      fetchAllRows<ClassFeatureRow>("class_features", FEATURE_COLUMNS, (query) =>
        query.eq("subclass_id", id),
      ),
      fetchSubclassSpells(id),
    ]);
  const [featureNames, spellNames] = await Promise.all([
    names(
      "class_feature",
      featureRows.map((feature) => feature.id),
    ),
    names(
      "spell",
      spellRows.map((spell) => spell.spell_id),
    ),
  ]);
  return {
    ...toRef(row.id, subclassNames),
    class: toRef(row.class_id, classNames),
    availableFromLevel: row.available_from_level,
    description: subclassDescriptions.get(String(row.id)) ?? MISSING_TEXT,
    features: featureRows
      .map((feature) => ({ ...toRef(feature.id, featureNames), level: feature.level }))
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, "fr")),
    spells: spellRows.map((spell) => ({
      spell: toRef(spell.spell_id, spellNames),
      level: spell.class_level,
      note: grantKindLabel(spell.grant_kind),
    })),
  };
});

// ---------------------------------------------------------------------------
// Aptitudes de classe (les options de classe en sont un sous-ensemble)
// ---------------------------------------------------------------------------

function toFeatureListItem(
  row: ClassFeatureRow,
  featureNames: Map<string, string>,
  classNames: Map<string, string>,
  subclassNames: Map<string, string>,
  subclasses: Map<number, SubclassRow>,
): FeatureListItem {
  const ownerClassId =
    row.class_id ?? (row.subclass_id ? subclasses.get(row.subclass_id)?.class_id : null) ?? null;
  return {
    ...toRef(row.id, featureNames),
    level: row.level,
    class: toOptionalRef(ownerClassId, classNames),
    subclass: toOptionalRef(row.subclass_id, subclassNames),
    choiceCode: row.choice_type,
    choiceLabel: row.choice_type ? formatChoiceType(row.choice_type) : null,
  };
}

/** Toutes les aptitudes (classes et sous-classes), triées par classe, sous-classe puis niveau. */
export async function listFeatures(): Promise<FeatureListItem[]> {
  const [rows, subclassRows, featureNames, classNames, subclassNames] = await Promise.all([
    fetchAllRows<ClassFeatureRow>("class_features", FEATURE_COLUMNS),
    fetchAllRows<SubclassRow>("subclasses", SUBCLASS_COLUMNS),
    names("class_feature"),
    names("class"),
    names("subclass"),
  ]);
  const subclasses = byId(subclassRows);
  return rows
    .map((row) => toFeatureListItem(row, featureNames, classNames, subclassNames, subclasses))
    .sort(
      (a, b) =>
        (a.class?.name ?? "").localeCompare(b.class?.name ?? "", "fr") ||
        (a.subclass?.name ?? "").localeCompare(b.subclass?.name ?? "", "fr") ||
        a.level - b.level ||
        a.name.localeCompare(b.name, "fr"),
    );
}

async function fetchFeaturesByChoice(choiceType: string): Promise<ClassFeatureRow[]> {
  return fetchAllRows<ClassFeatureRow>("class_features", FEATURE_COLUMNS, (query) =>
    query.eq("choice_type", choiceType),
  );
}

export const getFeatureById = cache(async function getFeatureById(
  id: number,
): Promise<FeatureDetail | null> {
  const [row] = await fetchAllRows<ClassFeatureRow>("class_features", FEATURE_COLUMNS, (query) =>
    query.eq("id", id),
  );
  if (!row) {
    return null;
  }
  const subclassRows = row.subclass_id
    ? await fetchAllRows<SubclassRow>("subclasses", SUBCLASS_COLUMNS, (query) =>
        query.eq("id", row.subclass_id),
      )
    : [];
  const ownerClassId = row.class_id ?? subclassRows[0]?.class_id ?? null;
  const linksInvocations = row.choice_type === "invocation" || row.choice_type === "pacte";

  const [featureNames, featureDescriptions, classNames, subclassNames, invocations, classOptions] =
    await Promise.all([
      names("class_feature", [row.id]),
      descriptions("class_feature", [row.id]),
      names("class", ownerClassId ? [ownerClassId] : []),
      names("subclass", row.subclass_id ? [row.subclass_id] : []),
      linksInvocations ? listInvocations() : Promise.resolve([]),
      row.choice_type && isClassOptionType(row.choice_type)
        ? listClassOptionsByType(row.choice_type)
        : Promise.resolve([]),
    ]);

  return {
    ...toFeatureListItem(row, featureNames, classNames, subclassNames, byId(subclassRows)),
    description: featureDescriptions.get(String(row.id)) ?? MISSING_TEXT,
    usesPerRestLabel: formatUsesPerRest(row.uses_per_rest),
    // Faveur de pacte : seulement les invocations qui exigent un pacte.
    invocations: invocations
      .filter((invocation) => row.choice_type !== "pacte" || invocation.pactCode !== null)
      .map((invocation) => ({ id: invocation.id, name: invocation.name })),
    classOptions: classOptions.map((option) => ({ id: option.id, name: option.name })),
  };
});

// ---------------------------------------------------------------------------
// Invocations occultes
// ---------------------------------------------------------------------------

export type InvocationListEntry = InvocationListItem & { pactCode: string | null };

export async function listInvocations(): Promise<InvocationListEntry[]> {
  const [rows, invocationNames] = await Promise.all([
    fetchAllRows<InvocationRow>("invocations", INVOCATION_COLUMNS),
    names("invocation"),
  ]);
  return sortByName(
    rows.map((row) => ({
      ...toRef(row.id, invocationNames),
      prerequisiteText: invocationPrerequisiteText(row.prerequisites),
      level: typeof row.prerequisites?.level === "number" ? row.prerequisites.level : null,
      pactCode: row.prerequisites?.pact ?? null,
    })),
  );
}

export const getInvocationById = cache(async function getInvocationById(
  id: number,
): Promise<InvocationDetail | null> {
  const [row] = await fetchAllRows<InvocationRow>("invocations", INVOCATION_COLUMNS, (query) =>
    query.eq("id", id),
  );
  if (!row) {
    return null;
  }
  const prerequisites = row.prerequisites ?? {};
  const cantripId =
    typeof prerequisites.cantrip_spell_id === "number" ? prerequisites.cantrip_spell_id : null;

  const [invocationNames, invocationDescriptions, grantingRows, pactRows, spellNames] =
    await Promise.all([
      names("invocation", [row.id]),
      descriptions("invocation", [row.id]),
      fetchFeaturesByChoice("invocation"),
      prerequisites.pact ? fetchFeaturesByChoice("pacte") : Promise.resolve([]),
      names("spell", cantripId ? [cantripId] : []),
    ]);

  const featureIds = [...grantingRows, ...pactRows].map((feature) => feature.id);
  const classIds = grantingRows.flatMap((feature) => (feature.class_id ? [feature.class_id] : []));
  const [featureNames, classNames] = await Promise.all([
    names("class_feature", featureIds),
    names("class", classIds),
  ]);

  return {
    ...toRef(row.id, invocationNames),
    prerequisiteText: invocationPrerequisiteText(prerequisites),
    level: typeof prerequisites.level === "number" ? prerequisites.level : null,
    description: invocationDescriptions.get(String(row.id)) ?? MISSING_TEXT,
    pactLabel: pactLabel(prerequisites.pact),
    pactFeature: pactRows[0] ? toRef(pactRows[0].id, featureNames) : null,
    cantrip: toOptionalRef(cantripId, spellNames),
    grantedBy: grantingRows.map((feature) => ({
      feature: toRef(feature.id, featureNames),
      class: toOptionalRef(feature.class_id, classNames),
    })),
  };
});

// ---------------------------------------------------------------------------
// Lignées raciales
// ---------------------------------------------------------------------------

function toLineageListItem(
  row: RaceLineageRow,
  lineageNames: Map<string, string>,
  raceNames: Map<string, string>,
  subraceNames: Map<string, string>,
): LineageListItem {
  return {
    ...toRef(row.id, lineageNames),
    race: toOptionalRef(row.race_id, raceNames),
    subrace: toOptionalRef(row.subrace_id, subraceNames),
    groupLabel: lineageGroupLabel(row.lineage_group),
    source: row.source_book,
  };
}

export async function listLineages(): Promise<LineageListItem[]> {
  const [rows, lineageNames, raceNames, subraceNames] = await Promise.all([
    fetchAllRows<RaceLineageRow>("race_lineages", LINEAGE_COLUMNS),
    names("race_lineage"),
    names("race"),
    names("subrace"),
  ]);
  return sortByName(rows.map((row) => toLineageListItem(row, lineageNames, raceNames, subraceNames)));
}

export const getLineageById = cache(async function getLineageById(
  id: number,
): Promise<LineageDetail | null> {
  const [row] = await fetchAllRows<RaceLineageRow>("race_lineages", LINEAGE_COLUMNS, (query) =>
    query.eq("id", id),
  );
  if (!row) {
    return null;
  }
  const [lineageNames, effects, raceNames, subraceNames, innateSpells] = await Promise.all([
    names("race_lineage", [row.id]),
    fetchTranslationMap("race_lineage", "mechanical_effect", [row.id]),
    names("race", row.race_id ? [row.race_id] : []),
    names("subrace", row.subrace_id ? [row.subrace_id] : []),
    fetchInnateSpells("lineage_id", id),
  ]);
  const hasBonuses = row.ability_bonuses !== null && Object.keys(row.ability_bonuses).length > 0;
  return {
    ...toLineageListItem(row, lineageNames, raceNames, subraceNames),
    effect: effects.get(String(row.id)) ?? null,
    damageType: row.damage_type,
    resistance: row.resistance_damage_type,
    abilityBonuses: hasBonuses ? formatAbilityBonuses(row.ability_bonuses) : null,
    innateSpells,
  };
});

/** Lignées rattachées à une race (hors sous-race), pour la fiche `/races`. */
export async function listLineagesForRace(raceId: number): Promise<Ref[]> {
  const rows = await fetchAllRows<RaceLineageRow>("race_lineages", LINEAGE_COLUMNS, (query) =>
    query.eq("race_id", raceId).is("subrace_id", null),
  );
  const lineageNames = await names(
    "race_lineage",
    rows.map((row) => row.id),
  );
  return sortByName(rows.map((row) => toRef(row.id, lineageNames)));
}
