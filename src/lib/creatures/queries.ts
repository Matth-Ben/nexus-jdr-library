import { cache } from "react";
import { fetchAllRows, fetchTranslationMap } from "@/lib/reference/fetch";
import { toCreatureDetail, toCreatureListItem } from "./format";
import type { CreatureDetail, CreatureListItem, CreatureListRow, CreatureRow } from "./types";

const LIST_COLUMNS = "id, size, creature_type, challenge_rating";
const DETAIL_COLUMNS = [
  LIST_COLUMNS,
  "alignment, armor_class, armor_detail, hit_points, hit_dice, speed",
  "ability_scores, saving_throws, skills",
  "damage_vulnerabilities, damage_resistances, damage_immunities, condition_immunities",
  "senses, languages, experience_points, proficiency_bonus, initiative_bonus",
  "traits, actions, bonus_actions, reactions, legendary_actions, source",
].join(", ");

/** Toutes les créatures (~330), triées par nom — filtrage en mémoire côté page. */
export async function listCreatures(): Promise<CreatureListItem[]> {
  const [rows, names] = await Promise.all([
    fetchAllRows<CreatureListRow>("creatures", LIST_COLUMNS),
    fetchTranslationMap("creature", "name"),
  ]);
  return rows
    .map((row) => toCreatureListItem(row, names))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export const getCreatureById = cache(async function getCreatureById(
  id: number,
): Promise<CreatureDetail | null> {
  const [rows, names] = await Promise.all([
    fetchAllRows<CreatureRow>("creatures", DETAIL_COLUMNS, (query) => query.eq("id", id)),
    fetchTranslationMap("creature", "name", [id]),
  ]);
  const row = rows[0];
  return row ? toCreatureDetail(row, names) : null;
});
