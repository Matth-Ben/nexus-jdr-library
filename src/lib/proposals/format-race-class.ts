import { formatAbilityList, formatSkillChoices, formatStringList } from "@/lib/classes/translations";
import type { ClassSkillChoices } from "@/lib/classes/types";
import { formatAbilityBonuses } from "@/lib/races/translations";
import type { AbilityBonuses } from "@/lib/races/types";
import {
  asArray,
  asInteger,
  asRecord,
  asStringArray,
  asText,
  MISSING_TEXT,
  type PayloadItem,
  type PayloadRow,
  type PayloadSection,
  type RenderedPayload,
} from "./payload-view";

/** Rendu des payloads de race et de classe, tolérant à toute forme malformée. */

const UNNAMED = "(sans nom)";

const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"] as const;

/** Ne garde que les bonus numériques connus (+ `choice_others`), jamais de clé arbitraire. */
function cleanAbilityBonuses(value: unknown): AbilityBonuses {
  const record = asRecord(value);
  const clean: AbilityBonuses = {};
  for (const key of ABILITY_KEYS) {
    const bonus = asInteger(record[key]);
    if (bonus !== null && bonus !== 0) clean[key] = bonus;
  }
  const choice = asRecord(record.choice_others);
  const count = asInteger(choice.count);
  const amount = asInteger(choice.amount);
  if (count !== null && amount !== null) clean.choice_others = { count, amount };
  return clean;
}

function bonusesLabel(value: unknown): string {
  const clean = cleanAbilityBonuses(value);
  return Object.keys(clean).length === 0 ? "Aucun" : formatAbilityBonuses(clean);
}

function traitItems(value: unknown): PayloadItem[] {
  return asArray(value).map((raw) => {
    const trait = asRecord(raw);
    const text = asText(trait.description);
    return { title: asText(trait.name) ?? UNNAMED, ...(text ? { text } : {}) };
  });
}

function positiveInteger(value: unknown): number | null {
  const number = asInteger(value);
  return number !== null && number > 0 ? number : null;
}

export function raceContent(payload: Record<string, unknown>): RenderedPayload {
  const speed = positiveInteger(payload.speed);
  const languages = asStringArray(payload.languages);
  const rows: PayloadRow[] = [
    { label: "Taille", value: asText(payload.size) ?? MISSING_TEXT },
    // Même affichage que la liste des races (`speedLabel` : « 30 m »).
    { label: "Vitesse", value: speed !== null ? `${speed} m` : MISSING_TEXT },
    { label: "Bonus de caractéristiques", value: bonusesLabel(payload.ability_bonuses) },
    { label: "Langues", value: languages.length > 0 ? languages.join(", ") : "Aucune" },
  ];

  const sections: PayloadSection[] = [];
  const traits = traitItems(payload.traits);
  if (traits.length > 0) sections.push({ title: "Traits", items: traits });

  const subraces: PayloadItem[] = asArray(payload.subraces).map((raw) => {
    const subrace = asRecord(raw);
    const subTraits = traitItems(subrace.traits);
    return {
      title: asText(subrace.name) ?? UNNAMED,
      rows: [{ label: "Bonus de caractéristiques", value: bonusesLabel(subrace.ability_bonuses) }],
      sections: subTraits.length > 0 ? [{ title: "Traits", items: subTraits }] : [],
    };
  });
  if (subraces.length > 0) sections.push({ title: "Sous-races", items: subraces, collapsible: true });

  // Une race n'a pas de description propre : ses traits en tiennent lieu.
  return { rows, description: null, sections };
}

function abilityNames(value: unknown): string {
  const names = formatAbilityList(asStringArray(value));
  return names.length > 0 ? names.join(", ") : MISSING_TEXT;
}

function cleanSkillChoices(value: unknown): ClassSkillChoices {
  const record = asRecord(value);
  const count = asInteger(record.count);
  const choices = record.choices === "toutes" ? "toutes" : asStringArray(record.choices);
  return { ...(count !== null ? { count } : {}), choices };
}

/** Tri par niveau ; niveaux illisibles en fin de liste ; ordre saisi conservé à égalité. */
function byLevel<T extends { level: number | null; position: number }>(a: T, b: T): number {
  return (a.level ?? Infinity) - (b.level ?? Infinity) || a.position - b.position;
}

export function classContent(payload: Record<string, unknown>): RenderedPayload {
  const hitDie = positiveInteger(payload.hit_die);
  const rows: PayloadRow[] = [
    { label: "Dé de vie", value: hitDie !== null ? `d${hitDie}` : MISSING_TEXT },
    { label: "Caractéristiques principales", value: abilityNames(payload.primary_abilities) },
    { label: "Jets de sauvegarde", value: abilityNames(payload.saving_throw_proficiencies) },
    { label: "Armures", value: formatStringList(asStringArray(payload.armor_proficiencies)) },
    { label: "Armes", value: formatStringList(asStringArray(payload.weapon_proficiencies)) },
    { label: "Outils", value: formatStringList(asStringArray(payload.tool_proficiencies)) },
    { label: "Compétences", value: formatSkillChoices(cleanSkillChoices(payload.skill_choices)) },
  ];

  const sections: PayloadSection[] = [];

  const features = asArray(payload.features)
    .map((raw, position) => {
      const feature = asRecord(raw);
      return { level: asInteger(feature.level), position, feature };
    })
    .sort(byLevel)
    .map(({ level, feature }): PayloadItem => {
      const text = asText(feature.description);
      return {
        title: asText(feature.name) ?? UNNAMED,
        group: level !== null ? `Niveau ${level}` : "Niveau non précisé",
        ...(text ? { text } : {}),
      };
    });
  if (features.length > 0) sections.push({ title: "Aptitudes de classe", items: features });

  const subclasses = asArray(payload.subclasses)
    .map((raw, position) => {
      const subclass = asRecord(raw);
      return { level: asInteger(subclass.available_from_level), position, subclass };
    })
    .sort(byLevel)
    .map(({ level, subclass }): PayloadItem => {
      const text = asText(subclass.description);
      return {
        title: asText(subclass.name) ?? UNNAMED,
        ...(level !== null ? { note: `Niveau ${level}` } : {}),
        ...(text ? { text } : {}),
      };
    });
  if (subclasses.length > 0) sections.push({ title: "Sous-classes", items: subclasses });

  return { rows, description: asText(payload.description), sections };
}
