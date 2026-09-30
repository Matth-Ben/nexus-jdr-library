import type { BackgroundChoices, BackgroundDetail, BackgroundListItem, BackgroundRow } from "./types";

export const MISSING_NAME = "(nom manquant)";

/** « 2 langues au choix (dont une langue exotique...) », `null` sans langue. */
export function formatLanguages(choices: BackgroundChoices | null): string | null {
  const count = choices?.languages ?? 0;
  const details = choices?.language_choices ?? [];
  if (count === 0 && details.length === 0) {
    return null;
  }
  const base =
    count > 0 ? `${count} langue${count > 1 ? "s" : ""} au choix` : "Langues";
  return details.length > 0 ? `${base} (${details.join(" ; ")})` : base;
}

export function toBackgroundListItem(
  row: BackgroundRow,
  names: Map<string, string>,
): BackgroundListItem {
  return {
    id: row.id,
    name: names.get(String(row.id)) ?? MISSING_NAME,
    skills: row.skill_proficiencies ?? [],
  };
}

export function toBackgroundDetail(
  row: BackgroundRow,
  texts: {
    names: Map<string, string>;
    descriptions: Map<string, string>;
    featureNames: Map<string, string>;
    featureDescriptions: Map<string, string>;
  },
): BackgroundDetail {
  const key = String(row.id);
  const choices = row.tool_or_language_choices;
  return {
    ...toBackgroundListItem(row, texts.names),
    description: texts.descriptions.get(key) ?? null,
    tools: choices?.tools ?? [],
    vehicles: choices?.vehicles ?? [],
    languages: formatLanguages(choices),
    equipment: row.equipment ?? [],
    featureName: texts.featureNames.get(key) ?? null,
    featureDescription: texts.featureDescriptions.get(key) ?? null,
    incomplete: row.is_incomplete === true,
  };
}
