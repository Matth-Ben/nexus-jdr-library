import { cache } from "react";
import { fetchAllRows, fetchTranslationMap } from "@/lib/reference/fetch";
import { toBackgroundDetail, toBackgroundListItem } from "./format";
import type { BackgroundDetail, BackgroundListItem, BackgroundRow } from "./types";

const COLUMNS = "id, skill_proficiencies, tool_or_language_choices, equipment, is_incomplete";

/** Tous les historiques (~70), triés par nom. */
export async function listBackgrounds(): Promise<BackgroundListItem[]> {
  const [rows, names] = await Promise.all([
    fetchAllRows<BackgroundRow>("backgrounds", COLUMNS),
    fetchTranslationMap("background", "name"),
  ]);
  return rows
    .map((row) => toBackgroundListItem(row, names))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export const getBackgroundById = cache(async function getBackgroundById(
  id: number,
): Promise<BackgroundDetail | null> {
  const [rows, names, descriptions, featureNames, featureDescriptions] = await Promise.all([
    fetchAllRows<BackgroundRow>("backgrounds", COLUMNS, (query) => query.eq("id", id)),
    fetchTranslationMap("background", "name", [id]),
    fetchTranslationMap("background", "description", [id]),
    fetchTranslationMap("background", "feature_name", [id]),
    fetchTranslationMap("background", "feature_description", [id]),
  ]);
  const row = rows[0];
  return row
    ? toBackgroundDetail(row, { names, descriptions, featureNames, featureDescriptions })
    : null;
});
