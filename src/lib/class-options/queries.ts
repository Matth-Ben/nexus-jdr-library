import { cache } from "react";
import { fetchAllRows, fetchTranslationMap, type QueryRefiner } from "@/lib/reference/fetch";
import { MISSING_TEXT, toOptionalRef, toRef } from "@/lib/reference/format";
import type { ClassFeatureRow, Ref } from "@/lib/reference/types";
import { classOptionTypeOrder, formatClassOptionType } from "./format";
import type { ClassOptionDetail, ClassOptionListItem, ClassOptionRow } from "./types";

const COLUMNS = "id, class_id, subclass_id, option_type, min_level, prerequisites, source";
const FEATURE_COLUMNS = "id, class_id, subclass_id, level, choice_type, uses_per_rest";

function toListItem(
  row: ClassOptionRow,
  optionNames: Map<string, string>,
  classNames: Map<string, string>,
  subclassNames: Map<string, string>,
): ClassOptionListItem {
  return {
    ...toRef(row.id, optionNames),
    typeCode: row.option_type,
    typeLabel: formatClassOptionType(row.option_type),
    class: toOptionalRef(row.class_id, classNames),
    subclass: toOptionalRef(row.subclass_id, subclassNames),
    minLevel: row.min_level,
    prerequisiteText: row.prerequisites?.text ?? null,
    cost: row.prerequisites?.cost ?? null,
    source: row.source,
  };
}

/** Tri : type d'option (ordre de la page), puis nom. */
function compareOptions(a: ClassOptionListItem, b: ClassOptionListItem): number {
  return (
    classOptionTypeOrder(a.typeCode) - classOptionTypeOrder(b.typeCode) ||
    a.name.localeCompare(b.name, "fr")
  );
}

async function loadOptions(refine?: QueryRefiner): Promise<ClassOptionListItem[]> {
  const rows = await fetchAllRows<ClassOptionRow>("class_options", COLUMNS, refine);
  const classIds = rows.flatMap((row) => (row.class_id ? [row.class_id] : []));
  const subclassIds = rows.flatMap((row) => (row.subclass_id ? [row.subclass_id] : []));
  const [optionNames, classNames, subclassNames] = await Promise.all([
    fetchTranslationMap(
      "class_option",
      "name",
      rows.map((row) => row.id),
    ),
    fetchTranslationMap("class", "name", classIds),
    fetchTranslationMap("subclass", "name", subclassIds),
  ]);
  return rows
    .map((row) => toListItem(row, optionNames, classNames, subclassNames))
    .sort(compareOptions);
}

/** Toutes les options de classe (~100). */
export function listClassOptions(): Promise<ClassOptionListItem[]> {
  return loadOptions();
}

/** Options d'un type donné (`manoeuvre`, `metamagie`...), pour la fiche d'une aptitude. */
export function listClassOptionsByType(optionType: string): Promise<ClassOptionListItem[]> {
  return loadOptions((query) => query.eq("option_type", optionType));
}

export const getClassOptionById = cache(async function getClassOptionById(
  id: number,
): Promise<ClassOptionDetail | null> {
  const [item] = await loadOptions((query) => query.eq("id", id));
  if (!item) {
    return null;
  }
  const [descriptions, features] = await Promise.all([
    fetchTranslationMap("class_option", "description", [id]),
    fetchAllRows<ClassFeatureRow>("class_features", FEATURE_COLUMNS, (query) =>
      query.eq("choice_type", item.typeCode),
    ),
  ]);
  const featureNames = await fetchTranslationMap(
    "class_feature",
    "name",
    features.map((feature) => feature.id),
  );
  const grantedBy: Ref[] = features
    .sort((a, b) => a.level - b.level)
    .map((feature) => toRef(feature.id, featureNames));

  return {
    ...item,
    description: descriptions.get(String(id)) ?? MISSING_TEXT,
    grantedBy,
  };
});
