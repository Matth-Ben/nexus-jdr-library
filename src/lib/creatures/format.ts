import type {
  AbilityCode,
  AbilityLine,
  CreatureDetail,
  CreatureListItem,
  CreatureListRow,
  CreatureRow,
  CreatureSpeed,
} from "./types";

export const MISSING_NAME = "(nom manquant)";

const ABILITIES: { code: AbilityCode; label: string }[] = [
  { code: "str", label: "FOR" },
  { code: "dex", label: "DEX" },
  { code: "con", label: "CON" },
  { code: "int", label: "INT" },
  { code: "wis", label: "SAG" },
  { code: "cha", label: "CHA" },
];

const FRACTIONS: Record<string, string> = { "0.125": "1/8", "0.25": "1/4", "0.5": "1/2" };

/** Facteur de puissance lisible : 0,125 → « 1/8 », 3 → « 3 ». */
export function formatChallenge(challenge: number): string {
  return FRACTIONS[String(challenge)] ?? String(challenge);
}

/** Bonus signé : 3 → « +3 », -1 → « −1 ». */
export function formatBonus(value: number): string {
  return value < 0 ? `−${Math.abs(value)}` : `+${value}`;
}

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/** Distance en pieds convertie en mètres (5 pi = 1,50 m), à la française. */
export function feetToMeters(feet: number): string {
  const meters = (feet / 5) * 1.5;
  const text = Number.isInteger(meters) ? String(meters) : meters.toFixed(2);
  return `${text.replace(".", ",")} m`;
}

const SPEED_LABELS: [keyof Omit<CreatureSpeed, "hover">, string][] = [
  ["burrow", "creusement"],
  ["climb", "escalade"],
  ["fly", "vol"],
  ["swim", "nage"],
];

/** « 9 m, vol 18 m (vol stationnaire), nage 12 m ». */
export function formatSpeed(speed: CreatureSpeed | null): string {
  if (!speed) {
    return "—";
  }
  const parts: string[] = [feetToMeters(speed.walk ?? 0)];
  for (const [key, label] of SPEED_LABELS) {
    const value = speed[key];
    if (value) {
      const hover = key === "fly" && speed.hover ? " (vol stationnaire)" : "";
      parts.push(`${label} ${feetToMeters(value)}${hover}`);
    }
  }
  return parts.join(", ");
}

export function formatAbilities(
  scores: CreatureRow["ability_scores"],
  saves: CreatureRow["saving_throws"],
): AbilityLine[] {
  return ABILITIES.map(({ code, label }) => {
    const score = scores?.[code] ?? 10;
    const modifier = abilityModifier(score);
    return {
      code,
      label,
      score,
      modifier: formatBonus(modifier),
      save: formatBonus(saves?.[code] ?? modifier),
    };
  });
}

/** « Discrétion +6, Perception +4 », `null` sans compétence. */
export function formatSkills(skills: CreatureRow["skills"]): string | null {
  const entries = Object.entries(skills ?? {});
  if (entries.length === 0) {
    return null;
  }
  return entries
    .sort(([a], [b]) => a.localeCompare(b, "fr"))
    .map(([name, bonus]) => `${name} ${formatBonus(bonus)}`)
    .join(", ");
}

export function toCreatureListItem(
  row: CreatureListRow,
  names: Map<string, string>,
): CreatureListItem {
  return {
    id: row.id,
    name: names.get(String(row.id)) ?? MISSING_NAME,
    size: row.size,
    type: row.creature_type,
    challenge: Number(row.challenge_rating),
  };
}

function blank(value: string | null): string | null {
  return value && value.trim() !== "" ? value : null;
}

export function toCreatureDetail(row: CreatureRow, names: Map<string, string>): CreatureDetail {
  const item = toCreatureListItem(row, names);
  const xp = row.experience_points ?? 0;
  const pb = row.proficiency_bonus;
  return {
    ...item,
    alignment: blank(row.alignment),
    armorClass: row.armor_detail ? `${row.armor_class} (${row.armor_detail})` : String(row.armor_class),
    hitPoints: row.hit_dice ? `${row.hit_points} (${row.hit_dice})` : String(row.hit_points),
    speed: formatSpeed(row.speed),
    initiative: row.initiative_bonus === null ? null : formatBonus(row.initiative_bonus),
    abilities: formatAbilities(row.ability_scores, row.saving_throws),
    skills: formatSkills(row.skills),
    vulnerabilities: blank(row.damage_vulnerabilities),
    resistances: blank(row.damage_resistances),
    immunities: blank(row.damage_immunities),
    conditionImmunities: blank(row.condition_immunities),
    senses: blank(row.senses),
    languages: blank(row.languages),
    challengeLabel: [
      formatChallenge(item.challenge),
      `${xp.toLocaleString("fr-FR")} PX`,
      pb !== null ? `bonus de maîtrise ${formatBonus(pb)}` : null,
    ]
      .filter(Boolean)
      .join(" · "),
    traits: row.traits ?? [],
    actions: row.actions ?? [],
    bonusActions: row.bonus_actions ?? [],
    reactions: row.reactions ?? [],
    legendaryActions: row.legendary_actions ?? [],
    source: blank(row.source),
  };
}
