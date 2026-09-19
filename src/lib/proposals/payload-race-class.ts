import {
  jsonbTextBytes,
  readBoundedInt,
  readLines,
  readList,
  readTextAt,
  type RowRef,
} from "./rows";
import {
  rawValue,
  readBool,
  readEnum,
  readText,
  type FieldErrors,
  type RawInput,
  type ValidationResult,
} from "./validation-core";

/**
 * Validateurs PURS des propositions de races et de classes. Les formes de
 * payload miment les tables de référence `races` / `subraces` / `classes`
 * (codes de caractéristiques en anglais, comme la base) pour qu'une future
 * fusion soit simple. Champs de formulaire et lecture des listes indexées :
 * voir `rows.ts`.
 */

// --- Bornes ---------------------------------------------------------------------

export const NAME_MAX = 80;

export const RACE_SIZES = ["Petite", "Moyenne", "Grande"] as const;
export const SPEED_MIN = 1;
export const SPEED_MAX = 120;
export const ABILITY_BONUS_MIN = -2;
export const ABILITY_BONUS_MAX = 3;
export const CHOICE_COUNT_MAX = 6;
export const CHOICE_AMOUNT_MAX = 3;
export const LANGUAGES_MAX = 10;
export const LANGUAGE_MAX_LENGTH = 60;
export const TRAIT_NAME_MAX = 80;
export const TRAIT_DESCRIPTION_MAX = 2000;
export const TRAITS_MAX = 15;
export const SUBRACES_MAX = 6;
export const SUBRACE_TRAITS_MAX = 8;

export const CLASS_DESCRIPTION_MAX = 5000;
export const HIT_DICE = [6, 8, 10, 12] as const;
export const PROFICIENCIES_MAX = 15;
export const PROFICIENCY_MAX_LENGTH = 80;
export const SKILL_COUNT_MAX = 6;
export const FEATURE_NAME_MAX = 100;
export const FEATURE_DESCRIPTION_MAX = 3000;
export const FEATURES_MAX = 40;
export const SUBCLASS_NAME_MAX = 100;
export const SUBCLASS_DESCRIPTION_MAX = 3000;
export const SUBCLASSES_MAX = 8;
export const LEVEL_MIN = 1;
export const LEVEL_MAX = 20;

/**
 * La base refuse un payload de plus de 60 000 octets (`octet_length(payload::text)`).
 * On mesure la taille EXACTE du texte jsonb et on garde une petite marge.
 */
export const RACE_CLASS_DB_LIMIT_BYTES = 60_000;
export const RACE_CLASS_PAYLOAD_MAX_BYTES = 59_500;

/** Codes de caractéristiques (comme la base) et libellés français de l'écran. */
export const ABILITY_CODES = ["str", "dex", "con", "int", "wis", "cha"] as const;
export type AbilityCode = (typeof ABILITY_CODES)[number];

export const ABILITY_NAMES: Record<AbilityCode, string> = {
  str: "Force",
  dex: "Dextérité",
  con: "Constitution",
  int: "Intelligence",
  wis: "Sagesse",
  cha: "Charisme",
};

/** Les 18 compétences (libellés français, comme `classes.skill_choices`). */
export const SKILLS = [
  "Acrobaties",
  "Arcanes",
  "Athlétisme",
  "Discrétion",
  "Dressage",
  "Escamotage",
  "Histoire",
  "Intimidation",
  "Investigation",
  "Médecine",
  "Nature",
  "Perception",
  "Perspicacité",
  "Persuasion",
  "Religion",
  "Représentation",
  "Survie",
  "Tromperie",
] as const;

// --- Communs ---------------------------------------------------------------------

function readName(input: RawInput, errors: FieldErrors): string | undefined {
  return readText(input, "title", errors, {
    required: true,
    max: NAME_MAX,
    requiredMessage: "Le nom est obligatoire.",
  });
}

function finishRaceClass(
  title: string | undefined,
  payload: Record<string, unknown>,
  errors: FieldErrors,
): ValidationResult {
  if (Object.keys(errors).length > 0 || title === undefined) {
    return { ok: false, errors };
  }
  const bytes = jsonbTextBytes(payload);
  if (bytes > RACE_CLASS_PAYLOAD_MAX_BYTES) {
    const kb = (value: number) => (Math.round(value / 100) / 10).toLocaleString("fr-FR");
    return {
      ok: false,
      errors: {
        _form: `Le contenu est trop volumineux (${kb(bytes)} Ko pour ${kb(RACE_CLASS_DB_LIMIT_BYTES)} Ko au maximum) : raccourcis certains textes ou retire des lignes.`,
      },
    };
  }
  return { ok: true, title, payload };
}

/** Lit `${readPrefix}.name` + `${readPrefix}.description` (modèle « nom + texte »). */
function readNamedText(
  input: RawInput,
  row: RowRef,
  errors: FieldErrors,
  limits: { name: number; description: number },
): { name: string; description: string } | undefined {
  const name = readTextAt(input, `${row.read}.name`, `${row.error}.name`, errors, {
    required: true,
    max: limits.name,
    requiredMessage: "Le nom est obligatoire.",
  });
  const description = readTextAt(input, `${row.read}.description`, `${row.error}.description`, errors, {
    required: true,
    max: limits.description,
    requiredMessage: "La description est obligatoire.",
  });
  return name === undefined || description === undefined ? undefined : { name, description };
}

// --- Race --------------------------------------------------------------------------

type AbilityBonuses = Partial<Record<AbilityCode, number>> & {
  choice_others?: { count: number; amount: number };
};

/**
 * Bonus de caractéristiques : `${readBase}ability.str` … et
 * `${readBase}choice_count` / `${readBase}choice_amount`. Les clés à 0 ou
 * vides sont absentes du résultat. `readBase` et `errorBase` valent `""` pour
 * la race, `subraces.<i>.` pour une sous-race.
 */
function readAbilityBonuses(
  input: RawInput,
  readBase: string,
  errorBase: string,
  errors: FieldErrors,
): AbilityBonuses {
  const bonuses: AbilityBonuses = {};
  for (const code of ABILITY_CODES) {
    const value = readBoundedInt(input, `${readBase}ability.${code}`, `${errorBase}ability.${code}`, errors, {
      min: ABILITY_BONUS_MIN,
      max: ABILITY_BONUS_MAX,
      label: `Bonus de ${ABILITY_NAMES[code]}`,
    });
    if (value !== undefined && value !== 0) bonuses[code] = value;
  }

  const count = readBoundedInt(input, `${readBase}choice_count`, `${errorBase}choice_count`, errors, {
    min: 1,
    max: CHOICE_COUNT_MAX,
    label: "Nombre de caractéristiques au choix",
  });
  const amount = readBoundedInt(input, `${readBase}choice_amount`, `${errorBase}choice_amount`, errors, {
    min: 1,
    max: CHOICE_AMOUNT_MAX,
    label: "Bonus des caractéristiques au choix",
  });
  const countGiven = rawValue(input, `${readBase}choice_count`);
  const amountGiven = rawValue(input, `${readBase}choice_amount`);
  const isFilled = (value: unknown) => value !== undefined && value !== null && String(value).trim() !== "";
  if (count !== undefined && amount !== undefined) {
    bonuses.choice_others = { count, amount };
  } else if (count !== undefined && !isFilled(amountGiven)) {
    errors[`${errorBase}choice_amount`] = "Renseigne aussi le bonus accordé aux caractéristiques au choix.";
  } else if (amount !== undefined && !isFilled(countGiven)) {
    errors[`${errorBase}choice_count`] = "Renseigne aussi le nombre de caractéristiques au choix.";
  }
  return bonuses;
}

function readTraits(
  input: RawInput,
  errors: FieldErrors,
  readPrefix: string,
  errorPrefix: string,
  min: number,
  max: number,
) {
  return readList(input, errors, {
    readPrefix,
    errorPrefix,
    min,
    max,
    noun: "trait",
    nounPlural: "traits",
    parseRow: (row, errs) =>
      readNamedText(input, row, errs, { name: TRAIT_NAME_MAX, description: TRAIT_DESCRIPTION_MAX }),
    duplicate: { key: (trait) => trait.name, field: "name", label: (trait) => trait.name },
  });
}

export function validateRace(input: RawInput): ValidationResult {
  const errors: FieldErrors = {};
  const title = readName(input, errors);
  const size = readEnum(input, "size", RACE_SIZES, errors, "La taille est obligatoire.");
  const speed = readBoundedInt(input, "speed", "speed", errors, {
    min: SPEED_MIN,
    max: SPEED_MAX,
    required: true,
    requiredMessage: "La vitesse est obligatoire.",
    label: "Vitesse",
  });
  const abilityBonuses = readAbilityBonuses(input, "", "", errors);
  const languages = readLines(input, "languages", errors, {
    max: LANGUAGES_MAX,
    itemMax: LANGUAGE_MAX_LENGTH,
    noun: "langues",
  });
  const traits = readTraits(input, errors, "traits", "traits", 1, TRAITS_MAX);

  const subraces = readList(input, errors, {
    readPrefix: "subraces",
    errorPrefix: "subraces",
    min: 0,
    max: SUBRACES_MAX,
    noun: "sous-race",
    nounPlural: "sous-races",
    parseRow: (row, errs) => {
      const before = Object.keys(errs).length;
      const name = readTextAt(input, `${row.read}.name`, `${row.error}.name`, errs, {
        required: true,
        max: NAME_MAX,
        requiredMessage: "Le nom de la sous-race est obligatoire.",
      });
      const bonuses = readAbilityBonuses(input, `${row.read}.`, `${row.error}.`, errs);
      const subTraits = readTraits(input, errs, `${row.read}.traits`, `${row.error}.traits`, 0, SUBRACE_TRAITS_MAX);
      if (Object.keys(errs).length > before || name === undefined) return undefined;
      return { name, ability_bonuses: bonuses, traits: subTraits };
    },
    duplicate: { key: (subrace) => subrace.name, field: "name", label: (subrace) => subrace.name },
  });

  return finishRaceClass(
    title,
    { size, speed, ability_bonuses: abilityBonuses, languages, traits, subraces },
    errors,
  );
}

// --- Classe ------------------------------------------------------------------------

function readAbilityChecks(
  input: RawInput,
  base: string,
  errors: FieldErrors,
  rule: { min: number; max: number; message: string },
): AbilityCode[] {
  const selected = ABILITY_CODES.filter((code) => readBool(input, `${base}.${code}`, errors, base));
  if (selected.length < rule.min || selected.length > rule.max) {
    errors[base] = rule.message;
    return [];
  }
  return selected;
}

/** Choix de compétences : `skill_count`, `skill_all`, cases `skill.<Nom>`. */
function readSkillChoices(
  input: RawInput,
  errors: FieldErrors,
): { count: number; choices: string[] | "toutes" } | undefined {
  const count = readBoundedInt(input, "skill_count", "skill_count", errors, {
    min: 0,
    max: SKILL_COUNT_MAX,
    required: true,
    requiredMessage: "Indique le nombre de compétences à choisir (0 si aucune).",
    label: "Nombre de compétences",
  });

  const known = new Set<string>(SKILLS);
  const keys =
    typeof FormData !== "undefined" && input instanceof FormData
      ? [...new Set(input.keys())]
      : Object.keys(input as Record<string, unknown>);
  const unknown = keys
    .filter((key) => key.startsWith("skill."))
    .map((key) => key.slice("skill.".length))
    .find((skill) => !known.has(skill) && readBool(input, `skill.${skill}`, {}, "skill_choices"));
  if (unknown !== undefined) {
    errors.skill_choices = `Compétence inconnue : « ${unknown.slice(0, 40)} ».`;
    return undefined;
  }

  const all = readBool(input, "skill_all", errors, "skill_choices");
  const checked = SKILLS.filter((skill) => readBool(input, `skill.${skill}`, errors, "skill_choices"));
  if (count === undefined) return undefined;

  if (count === 0) {
    if (all || checked.length > 0) {
      errors.skill_count = "Indique combien de compétences choisir, ou décoche les compétences.";
      return undefined;
    }
    return { count: 0, choices: [] };
  }
  if (all) return { count, choices: "toutes" };
  if (checked.length < count) {
    errors.skill_choices = `Coche au moins ${count} compétence${count > 1 ? "s" : ""} (${checked.length} cochée${checked.length > 1 ? "s" : ""}), ou « toutes les compétences ».`;
    return undefined;
  }
  return { count, choices: checked };
}

export function validateClass(input: RawInput): ValidationResult {
  const errors: FieldErrors = {};
  const title = readName(input, errors);
  const description = readText(input, "description", errors, {
    required: true,
    max: CLASS_DESCRIPTION_MAX,
    requiredMessage: "La description est obligatoire.",
  });

  let hitDie: number | undefined;
  const rawDie = readBoundedInt(input, "hit_die", "hit_die", errors, {
    min: 6,
    max: 12,
    required: true,
    requiredMessage: "Le dé de vie est obligatoire.",
    label: "Dé de vie",
  });
  if (rawDie !== undefined) {
    if ((HIT_DICE as readonly number[]).includes(rawDie)) hitDie = rawDie;
    else errors.hit_die = "Le dé de vie doit valoir d6, d8, d10 ou d12.";
  }

  const primary = readAbilityChecks(input, "primary_abilities", errors, {
    min: 1,
    max: 2,
    message: "Coche une ou deux caractéristiques principales.",
  });
  const saves = readAbilityChecks(input, "saving_throw_proficiencies", errors, {
    min: 2,
    max: 2,
    message: "Coche exactement deux jets de sauvegarde maîtrisés.",
  });

  const proficiency = (name: string, noun: string) =>
    readLines(input, name, errors, { max: PROFICIENCIES_MAX, itemMax: PROFICIENCY_MAX_LENGTH, noun });
  const armor = proficiency("armor_proficiencies", "maîtrises d'armures");
  const weapons = proficiency("weapon_proficiencies", "maîtrises d'armes");
  const tools = proficiency("tool_proficiencies", "maîtrises d'outils");

  const skillChoices = readSkillChoices(input, errors);

  const features = readList(input, errors, {
    readPrefix: "features",
    errorPrefix: "features",
    min: 0,
    max: FEATURES_MAX,
    noun: "aptitude",
    nounPlural: "aptitudes",
    parseRow: (row, errs) => {
      const level = readBoundedInt(input, `${row.read}.level`, `${row.error}.level`, errs, {
        min: LEVEL_MIN,
        max: LEVEL_MAX,
        required: true,
        requiredMessage: "Le niveau est obligatoire.",
        label: "Niveau",
      });
      const text = readNamedText(input, row, errs, {
        name: FEATURE_NAME_MAX,
        description: FEATURE_DESCRIPTION_MAX,
      });
      return level === undefined || text === undefined ? undefined : { level, ...text };
    },
    duplicate: {
      key: (feature) => `${feature.level}|${feature.name}`,
      field: "name",
      label: (feature) => `${feature.name} (niveau ${feature.level})`,
    },
  });

  const subclasses = readList(input, errors, {
    readPrefix: "subclasses",
    errorPrefix: "subclasses",
    min: 0,
    max: SUBCLASSES_MAX,
    noun: "sous-classe",
    nounPlural: "sous-classes",
    parseRow: (row, errs) => {
      const level = readBoundedInt(input, `${row.read}.available_from_level`, `${row.error}.available_from_level`, errs, {
        min: LEVEL_MIN,
        max: LEVEL_MAX,
        required: true,
        requiredMessage: "Le niveau d'accès est obligatoire.",
        label: "Niveau d'accès",
      });
      const text = readNamedText(input, row, errs, {
        name: SUBCLASS_NAME_MAX,
        description: SUBCLASS_DESCRIPTION_MAX,
      });
      return level === undefined || text === undefined
        ? undefined
        : { name: text.name, available_from_level: level, description: text.description };
    },
    duplicate: { key: (subclass) => subclass.name, field: "name", label: (subclass) => subclass.name },
  });

  return finishRaceClass(
    title,
    {
      description,
      hit_die: hitDie,
      primary_abilities: primary,
      saving_throw_proficiencies: saves,
      armor_proficiencies: armor,
      weapon_proficiencies: weapons,
      tool_proficiencies: tools,
      skill_choices: skillChoices,
      features,
      subclasses,
    },
    errors,
  );
}

