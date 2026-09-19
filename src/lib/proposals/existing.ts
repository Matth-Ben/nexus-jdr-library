import { normalizeToolProficiencies } from "@/lib/classes/translations";
import { toFrenchCost } from "@/lib/items/translations";
import { ABILITY_CODES, SKILLS } from "./payload-race-class";
import { normalizeNewlines } from "./validation-core";
import { asArray, asInteger, asRecord, asStringArray, asText } from "./payload-view";
import type { ProposalType } from "./types";

/**
 * Éléments EXISTANTS de la bibliothèque vus comme des propositions : les lignes
 * BRUTES de la base (jamais les vues formatées de `src/lib/<type>/queries.ts`)
 * sont converties en `payload` (même forme et même normalisation que la sortie
 * des validateurs `payload*.ts`), puis en valeurs de formulaire.
 *
 * Ce module est PUR (aucun accès réseau) ; la lecture en base est dans
 * `existing-fetch.ts`. La normalisation est volontairement identique à celle des
 * validateurs : un formulaire rendu sans rien changer produit exactement le
 * payload de l'existant, ce qui permet de refuser « Aucune modification détectée ».
 */

// --- Types ---------------------------------------------------------------------

/** Nom et description français (`translations`, locale `fr`) d'une entité. */
export interface Translated {
  name?: string | null;
  description?: string | null;
}

export interface ExistingContent {
  type: ProposalType;
  id: number;
  /** Nom actuel (traduction française) : titre prérempli du formulaire. */
  title: string;
  /** Version actuelle, dans la forme et la normalisation d'un payload de proposition. */
  payload: Record<string, unknown>;
  /** Conversions approximatives à signaler à l'utilisateur. */
  warnings: string[];
}

export interface SpellRow {
  level: number | null;
  school: string | null;
  casting_time: string | null;
  range: string | null;
  duration: string | null;
  components: unknown;
  concentration: boolean | null;
  ritual: boolean | null;
}

export interface FeatRow {
  prerequisites: unknown;
}

export interface ItemRow {
  category: string | null;
  weight: number | string | null;
  cost: unknown;
  rarity: string | null;
  requires_attunement: boolean | null;
  consumable: boolean | null;
}

export interface RaceRow {
  size: string | null;
  speed: number | null;
  ability_bonuses: unknown;
  languages: unknown;
  traits: unknown;
}

export interface SubraceInput {
  id: number;
  ability_bonuses: unknown;
  traits: unknown;
  name?: string | null;
}

export interface ClassRow {
  hit_die: number | null;
  primary_abilities: unknown;
  saving_throw_proficiencies: unknown;
  armor_proficiencies: unknown;
  weapon_proficiencies: unknown;
  tool_proficiencies: unknown;
  skill_choices: unknown;
}

export interface ClassFeatureInput {
  id: number;
  level: number | null;
  name?: string | null;
  description?: string | null;
}

export interface SubclassInput {
  id: number;
  available_from_level: number | null;
  name?: string | null;
  description?: string | null;
}

// --- Normalisation (miroir des validateurs) -------------------------------------

function clean(value: unknown): string {
  return typeof value === "string" ? normalizeNewlines(value.replaceAll("\u0000", "")).trim() : "";
}

function cleanLines(value: unknown): string[] {
  return asArray(value)
    .map(clean)
    .filter((line) => line !== "");
}

/** Poids : 4 décimales au plus (limite du validateur), `null` si absent ou illisible. */
function cleanWeight(value: unknown): number | null {
  const number = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof number !== "number" || !Number.isFinite(number) || number < 0) return null;
  return Math.round(number * 10_000) / 10_000;
}

type AbilityCode = (typeof ABILITY_CODES)[number];

/** Bonus de caractéristiques : uniquement les codes connus non nuls (+ `choice_others`), comme le validateur. */
function cleanBonuses(value: unknown): Record<string, unknown> {
  const record = asRecord(value);
  const bonuses: Record<string, unknown> = {};
  for (const code of ABILITY_CODES) {
    const bonus = asInteger(record[code]);
    if (bonus !== null && bonus !== 0) bonuses[code] = bonus;
  }
  const choice = asRecord(record.choice_others);
  const count = asInteger(choice.count);
  const amount = asInteger(choice.amount);
  if (count !== null && amount !== null) bonuses.choice_others = { count, amount };
  return bonuses;
}

function cleanTraits(value: unknown): { name: string; description: string }[] {
  return asArray(value)
    .map((raw) => {
      const trait = asRecord(raw);
      return { name: clean(trait.name), description: clean(trait.description) };
    })
    .filter((trait) => trait.name !== "" || trait.description !== "");
}

function abilityCodes(value: unknown): AbilityCode[] {
  const wanted = new Set(asStringArray(value));
  return ABILITY_CODES.filter((code) => wanted.has(code));
}

// --- Construction du payload par type ---------------------------------------------

export function buildSpellContent(id: number, row: SpellRow, tr: Translated): ExistingContent {
  const components = asRecord(row.components);
  const payload: Record<string, unknown> = {
    description: clean(tr.description),
    level: row.level,
    components: {
      verbal: components.verbal === true,
      somatic: components.somatic === true,
      material: components.material === true,
    },
    concentration: row.concentration === true,
    ritual: row.ritual === true,
  };
  for (const [key, value] of [
    ["school", row.school],
    ["casting_time", row.casting_time],
    ["range", row.range],
    ["duration", row.duration],
  ] as const) {
    const text = clean(value);
    if (text !== "") payload[key] = text;
  }
  return { type: "spell", id, title: clean(tr.name), payload, warnings: [] };
}

export function buildFeatContent(id: number, row: FeatRow, tr: Translated): ExistingContent {
  const payload: Record<string, unknown> = { description: clean(tr.description) };
  const prerequisite = clean(asRecord(row.prerequisites).text);
  if (prerequisite !== "") payload.prerequisite = prerequisite;
  return { type: "feat", id, title: clean(tr.name), payload, warnings: [] };
}

export function buildItemContent(id: number, row: ItemRow, tr: Translated): ExistingContent {
  const payload: Record<string, unknown> = {
    description: clean(tr.description),
    category: clean(row.category),
    requires_attunement: row.requires_attunement === true,
    consumable: row.consumable === true,
  };
  const cost = asRecord(row.cost);
  const french = toFrenchCost(
    typeof cost.amount === "number" && typeof cost.currency === "string"
      ? { amount: cost.amount, currency: cost.currency }
      : null,
  );
  if (french) payload.cost = french;
  const weight = cleanWeight(row.weight);
  if (weight !== null) payload.weight = weight;
  const rarity = clean(row.rarity);
  if (rarity !== "") payload.rarity = rarity;
  return { type: "item", id, title: clean(tr.name), payload, warnings: [] };
}

export function buildRaceContent(
  id: number,
  row: RaceRow,
  subraces: readonly SubraceInput[],
  tr: Translated,
): ExistingContent {
  const payload: Record<string, unknown> = {
    size: clean(row.size),
    speed: row.speed,
    ability_bonuses: cleanBonuses(row.ability_bonuses),
    languages: cleanLines(row.languages),
    traits: cleanTraits(row.traits),
    subraces: [...subraces]
      .sort((a, b) => a.id - b.id)
      .map((subrace) => ({
        name: clean(subrace.name),
        ability_bonuses: cleanBonuses(subrace.ability_bonuses),
        traits: cleanTraits(subrace.traits),
      })),
  };
  return { type: "race", id, title: clean(tr.name), payload, warnings: [] };
}

export const TOOL_CHOICE_WARNING =
  "Les maîtrises d'outils « au choix » de cette classe (ex. « 3 instruments de musique au choix ») sont représentées par une ligne de texte libre.";

/** Tri par niveau puis par identifiant (ordre stable et identique à celui de la fiche). */
function byLevelThenId<T extends { level: number | null; id: number }>(a: T, b: T): number {
  return (a.level ?? Infinity) - (b.level ?? Infinity) || a.id - b.id;
}

export function buildClassContent(
  id: number,
  row: ClassRow,
  features: readonly ClassFeatureInput[],
  subclasses: readonly SubclassInput[],
  tr: Translated,
): ExistingContent {
  const warnings: string[] = [];

  const rawTools = row.tool_proficiencies;
  const isToolChoice = typeof rawTools === "object" && rawTools !== null && !Array.isArray(rawTools);
  const tools = normalizeToolProficiencies(rawTools as Parameters<typeof normalizeToolProficiencies>[0]).map(clean);
  if (isToolChoice && tools.length > 0) warnings.push(TOOL_CHOICE_WARNING);

  const skills = asRecord(row.skill_choices);
  const skillList = asStringArray(skills.choices);
  const choices = skills.choices === "toutes" ? "toutes" : SKILLS.filter((skill) => skillList.includes(skill));
  const count = asInteger(skills.count) ?? 0;

  const payload: Record<string, unknown> = {
    description: clean(tr.description),
    hit_die: row.hit_die,
    primary_abilities: abilityCodes(row.primary_abilities),
    saving_throw_proficiencies: abilityCodes(row.saving_throw_proficiencies),
    armor_proficiencies: cleanLines(row.armor_proficiencies),
    weapon_proficiencies: cleanLines(row.weapon_proficiencies),
    tool_proficiencies: tools,
    skill_choices: { count, choices },
    features: features
      .map((feature) => ({ id: feature.id, level: feature.level, feature }))
      .sort(byLevelThenId)
      .map(({ feature }) => ({
        level: feature.level,
        name: clean(feature.name),
        description: clean(feature.description),
      })),
    subclasses: subclasses
      .map((subclass) => ({ id: subclass.id, level: subclass.available_from_level, subclass }))
      .sort(byLevelThenId)
      .map(({ subclass }) => ({
        name: clean(subclass.name),
        available_from_level: subclass.available_from_level,
        description: clean(subclass.description),
      })),
  };
  return { type: "class", id, title: clean(tr.name), payload, warnings };
}

// --- Payload → valeurs de formulaire ---------------------------------------------

export type FormValues = Record<string, string>;

const ON = "on";

function setBonuses(values: FormValues, prefix: string, bonusesValue: unknown): void {
  const bonuses = asRecord(bonusesValue);
  for (const code of ABILITY_CODES) {
    const bonus = asInteger(bonuses[code]);
    if (bonus !== null && bonus !== 0) values[`${prefix}ability.${code}`] = String(bonus);
  }
  const choice = asRecord(bonuses.choice_others);
  const count = asInteger(choice.count);
  const amount = asInteger(choice.amount);
  if (count !== null && amount !== null) {
    values[`${prefix}choice_count`] = String(count);
    values[`${prefix}choice_amount`] = String(amount);
  }
}

function setTraits(values: FormValues, prefix: string, traitsValue: unknown): void {
  asArray(traitsValue).forEach((raw, index) => {
    const trait = asRecord(raw);
    values[`${prefix}.${index}.name`] = clean(trait.name);
    values[`${prefix}.${index}.description`] = clean(trait.description);
  });
}

function text(value: unknown): string {
  return asText(value) ?? "";
}

/**
 * Valeurs de formulaire (mêmes noms de champs que `NewProposalForm`) qui,
 * soumises telles quelles, redonnent le payload de l'existant.
 */
export function payloadToFormValues(type: ProposalType, title: string, payload: Record<string, unknown>): FormValues {
  const values: FormValues = { content_type: type, title };

  if (type === "spell") {
    values.description = text(payload.description);
    if (typeof payload.level === "number") values.level = String(payload.level);
    values.school = text(payload.school);
    values.casting_time = text(payload.casting_time);
    values.range = text(payload.range);
    values.duration = text(payload.duration);
    const components = asRecord(payload.components);
    for (const key of ["verbal", "somatic", "material"] as const) {
      if (components[key] === true) values[`component_${key}`] = ON;
    }
    if (payload.concentration === true) values.concentration = ON;
    if (payload.ritual === true) values.ritual = ON;
  } else if (type === "feat") {
    values.description = text(payload.description);
    values.prerequisite = text(payload.prerequisite);
  } else if (type === "item") {
    values.description = text(payload.description);
    values.category = text(payload.category);
    values.rarity = text(payload.rarity);
    const cost = asRecord(payload.cost);
    if (typeof cost.amount === "number") {
      values.cost_amount = String(cost.amount);
      values.cost_currency = text(cost.currency) || "po";
    }
    if (typeof payload.weight === "number") values.weight = String(payload.weight);
    if (payload.requires_attunement === true) values.requires_attunement = ON;
    if (payload.consumable === true) values.consumable = ON;
  } else if (type === "race") {
    values.size = text(payload.size);
    if (typeof payload.speed === "number") values.speed = String(payload.speed);
    setBonuses(values, "", payload.ability_bonuses);
    values.languages = asStringArray(payload.languages).join("\n");
    setTraits(values, "traits", payload.traits);
    asArray(payload.subraces).forEach((raw, index) => {
      const subrace = asRecord(raw);
      values[`subraces.${index}.name`] = clean(subrace.name);
      setBonuses(values, `subraces.${index}.`, subrace.ability_bonuses);
      setTraits(values, `subraces.${index}.traits`, subrace.traits);
    });
  } else {
    values.description = text(payload.description);
    if (typeof payload.hit_die === "number") values.hit_die = String(payload.hit_die);
    for (const base of ["primary_abilities", "saving_throw_proficiencies"] as const) {
      for (const code of asStringArray(payload[base])) values[`${base}.${code}`] = ON;
    }
    for (const base of ["armor_proficiencies", "weapon_proficiencies", "tool_proficiencies"] as const) {
      values[base] = asStringArray(payload[base]).join("\n");
    }
    const skills = asRecord(payload.skill_choices);
    values.skill_count = String(asInteger(skills.count) ?? 0);
    if (skills.choices === "toutes") values.skill_all = ON;
    else for (const skill of asStringArray(skills.choices)) values[`skill.${skill}`] = ON;
    asArray(payload.features).forEach((raw, index) => {
      const feature = asRecord(raw);
      const level = asInteger(feature.level);
      values[`features.${index}.level`] = level !== null ? String(level) : "";
      values[`features.${index}.name`] = clean(feature.name);
      values[`features.${index}.description`] = clean(feature.description);
    });
    asArray(payload.subclasses).forEach((raw, index) => {
      const subclass = asRecord(raw);
      const level = asInteger(subclass.available_from_level);
      values[`subclasses.${index}.name`] = clean(subclass.name);
      values[`subclasses.${index}.available_from_level`] = level !== null ? String(level) : "";
      values[`subclasses.${index}.description`] = clean(subclass.description);
    });
  }
  return values;
}

/** Valeurs de formulaire de l'existant (titre = nom actuel). */
export function existingFormValues(existing: ExistingContent): FormValues {
  return payloadToFormValues(existing.type, existing.title, existing.payload);
}

/** Écoles à accepter en plus de la liste standard : l'école actuelle du sort ciblé (ex. « Invocation »). */
export function allowedSchoolsFor(existing: ExistingContent | null): string[] {
  if (!existing || existing.type !== "spell") return [];
  const school = asText(existing.payload.school);
  return school ? [school] : [];
}

// --- Comparaison ---------------------------------------------------------------

/** JSON à clés triées, `undefined` ignoré : deux payloads équivalents donnent le même texte. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value)) ?? "null";
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, item]) => [key, sortKeys(item)]),
    );
  }
  return value;
}

/** Vrai si le titre et le payload proposés sont identiques à l'existant (ordre des clés ignoré). */
export function isUnchanged(
  existing: Pick<ExistingContent, "title" | "payload">,
  proposed: { title: string; payload: unknown },
): boolean {
  return existing.title === proposed.title && canonicalJson(existing.payload) === canonicalJson(proposed.payload);
}
