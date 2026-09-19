import { isProposalType } from "./filters";
import { validateClass, validateRace } from "./payload-race-class";
import type { ProposalType } from "./types";
import {
  readBool,
  readEnum,
  readText,
  rawValue,
  stripControl,
  length,
  type FieldErrors,
  type RawInput,
  type ValidationOptions,
  type ValidationResult,
} from "./validation-core";

export type { FieldErrors, RawInput, ValidationOptions, ValidationResult } from "./validation-core";

/**
 * Validateurs PURS du contenu d'une proposition. Ils ne font confiance à rien :
 * le formulaire peut être contourné, on revalide côté serveur (bornes,
 * énumérations, types). Ils renvoient le `title` et le `payload` nettoyés
 * (uniquement les clés connues) ou les erreurs champ par champ.
 */

// --- Bornes (alignées sur le cahier des charges et la migration) ------------

export const TITLE_MAX = 120;
export const DESCRIPTION_MAX = 5000;
export const SHORT_TEXT_MAX = 60;
export const PREREQUISITE_MAX = 200;
export const COMMENT_MAX = 2000;
export const REASON_MAX = 500;
/** La base refuse un payload > 20000 octets ; marge pour la mise en forme jsonb. */
export const PAYLOAD_MAX_BYTES = 19500;
const AMOUNT_MAX = 1_000_000_000;
const WEIGHT_MAX = 100_000;

// --- Énumérations ------------------------------------------------------------

export const SPELL_SCHOOLS = [
  "Abjuration",
  "Conjuration",
  "Divination",
  "Enchantement",
  "Évocation",
  "Illusion",
  "Nécromancie",
  "Transmutation",
] as const;

export const ITEM_CATEGORIES = [
  "arme",
  "armure",
  "bouclier",
  "outil",
  "equipement_general",
  "objet_magique",
  "monture_vehicule",
] as const;

export const RARITIES = ["commune", "peu_commune", "rare", "tres_rare", "legendaire", "artefact"] as const;

export const RARITY_LABELS: Record<(typeof RARITIES)[number], string> = {
  commune: "Commune",
  peu_commune: "Peu commune",
  rare: "Rare",
  tres_rare: "Très rare",
  legendaire: "Légendaire",
  artefact: "Artéfact",
};

export const CURRENCIES = ["po", "pa", "pc"] as const;

// --- Nombres -----------------------------------------------------------------

/** Nombre décimal positif ou nul, écriture simple ("1,5" accepté, pas d'exposant). */
function parseDecimal(value: unknown, max: number): number | "invalid" | "empty" {
  if (value === undefined || value === null) return "empty";
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 && value <= max ? value : "invalid";
  }
  if (typeof value !== "string") return "invalid";
  const text = value.trim().replace(",", ".");
  if (text === "") return "empty";
  if (!/^\d{1,10}(\.\d{1,4})?$/.test(text)) return "invalid";
  const number = Number(text);
  return number <= max ? number : "invalid";
}

function validateTitle(input: RawInput, errors: FieldErrors): string | undefined {
  return readText(input, "title", errors, {
    required: true,
    max: TITLE_MAX,
    requiredMessage: "Le titre est obligatoire.",
  });
}

function finish(
  title: string | undefined,
  payload: Record<string, unknown>,
  errors: FieldErrors,
): ValidationResult {
  if (Object.keys(errors).length === 0 && title !== undefined) {
    const bytes = new TextEncoder().encode(JSON.stringify(payload)).length;
    if (bytes > PAYLOAD_MAX_BYTES) {
      return { ok: false, errors: { description: "Le contenu est trop volumineux : raccourcis la description." } };
    }
    return { ok: true, title, payload };
  }
  return { ok: false, errors };
}

// --- Validateurs par type ---------------------------------------------------

export function validateSpell(input: RawInput, options: ValidationOptions = {}): ValidationResult {
  const errors: FieldErrors = {};
  const modification = options.modification === true;
  const title = validateTitle(input, errors);
  const description = readText(input, "description", errors, { required: true, max: DESCRIPTION_MAX });

  let level: number | undefined;
  const rawLevel = rawValue(input, "level");
  if (rawLevel === undefined || rawLevel === null || (typeof rawLevel === "string" && rawLevel.trim() === "")) {
    errors.level = "Le niveau est obligatoire.";
  } else if (
    (typeof rawLevel === "number" && Number.isInteger(rawLevel) && rawLevel >= 0 && rawLevel <= 9) ||
    (typeof rawLevel === "string" && /^[0-9]$/.test(rawLevel.trim()))
  ) {
    level = Number(rawLevel);
  } else {
    errors.level = "Le niveau doit être un entier entre 0 et 9.";
  }

  // En modification, école, temps, portée et durée sont nullables en base : vides = absents du payload.
  const schoolRaw = rawValue(input, "school");
  const schoolEmpty =
    schoolRaw === undefined || schoolRaw === null || (typeof schoolRaw === "string" && schoolRaw.trim() === "");
  const school =
    modification && schoolEmpty
      ? undefined
      : readEnum(
          input,
          "school",
          [...SPELL_SCHOOLS, ...(modification ? (options.allowedSchools ?? []) : [])],
          errors,
          "L'école est obligatoire.",
        );
  const shortText = (name: string) => readText(input, name, errors, { required: !modification, max: SHORT_TEXT_MAX });
  const castingTime = shortText("casting_time");
  const range = shortText("range");
  const duration = shortText("duration");
  const orAbsent = (value: string | undefined) => (modification && value === "" ? undefined : value);

  // `components` : objet imbriqué (JSON) ou champs plats `component_*` (formulaire).
  const nested = (input as Record<string, unknown>).components;
  const nestedInput: Record<string, unknown> | null =
    !(typeof FormData !== "undefined" && input instanceof FormData) &&
    typeof nested === "object" &&
    nested !== null &&
    !Array.isArray(nested)
      ? (nested as Record<string, unknown>)
      : null;
  const component = (key: "verbal" | "somatic" | "material") =>
    readBool(nestedInput ?? input, nestedInput ? key : `component_${key}`, errors, "components");
  const components = { verbal: component("verbal"), somatic: component("somatic"), material: component("material") };

  const concentration = readBool(input, "concentration", errors);
  const ritual = readBool(input, "ritual", errors);

  return finish(
    title,
    {
      description,
      level,
      school,
      casting_time: orAbsent(castingTime),
      range: orAbsent(range),
      duration: orAbsent(duration),
      components,
      concentration,
      ritual,
    },
    errors,
  );
}

export function validateFeat(input: RawInput): ValidationResult {
  const errors: FieldErrors = {};
  const title = validateTitle(input, errors);
  const description = readText(input, "description", errors, { required: true, max: DESCRIPTION_MAX });
  const prerequisite = readText(input, "prerequisite", errors, { max: PREREQUISITE_MAX });

  const payload: Record<string, unknown> = { description };
  if (prerequisite) {
    payload.prerequisite = prerequisite;
  }
  return finish(title, payload, errors);
}

export function validateItem(input: RawInput, options: ValidationOptions = {}): ValidationResult {
  const errors: FieldErrors = {};
  const title = validateTitle(input, errors);
  // En modification, la description peut être absente de la base (19 objets sur 86) : vide acceptée.
  const description = readText(input, "description", errors, {
    required: options.modification !== true,
    max: DESCRIPTION_MAX,
  });
  const category = readEnum(input, "category", ITEM_CATEGORIES, errors, "La catégorie est obligatoire.");

  const payload: Record<string, unknown> = { description, category };

  const amount = parseDecimal(rawValue(input, "cost_amount"), AMOUNT_MAX);
  if (amount === "invalid") {
    errors.cost_amount = "Le coût doit être un nombre positif ou nul.";
  } else if (amount !== "empty") {
    const rawCurrency = rawValue(input, "cost_currency");
    const currency = rawCurrency === undefined || rawCurrency === null || rawCurrency === "" ? "po" : rawCurrency;
    if (typeof currency !== "string" || !(CURRENCIES as readonly string[]).includes(currency.trim())) {
      errors.cost_currency = "Devise non reconnue (po, pa ou pc).";
    } else {
      payload.cost = { amount, currency: currency.trim() };
    }
  }

  const weight = parseDecimal(rawValue(input, "weight"), WEIGHT_MAX);
  if (weight === "invalid") {
    errors.weight = "Le poids doit être un nombre positif ou nul (en kg).";
  } else if (weight !== "empty") {
    payload.weight = weight;
  }

  const rawRarity = rawValue(input, "rarity");
  if (rawRarity !== undefined && rawRarity !== null && !(typeof rawRarity === "string" && rawRarity.trim() === "")) {
    if (typeof rawRarity !== "string" || !(RARITIES as readonly string[]).includes(rawRarity.trim())) {
      errors.rarity = "Valeur non reconnue.";
    } else {
      payload.rarity = rawRarity.trim();
    }
  }

  payload.requires_attunement = readBool(input, "requires_attunement", errors);
  payload.consumable = readBool(input, "consumable", errors);

  return finish(title, payload, errors);
}

export function validateProposal(type: unknown, input: RawInput, options: ValidationOptions = {}): ValidationResult {
  if (!isProposalType(type)) {
    return { ok: false, errors: { content_type: "Type de contenu invalide." } };
  }
  const validators: Record<ProposalType, (input: RawInput, options?: ValidationOptions) => ValidationResult> = {
    spell: validateSpell,
    feat: validateFeat,
    item: validateItem,
    race: validateRace,
    class: validateClass,
  };
  return validators[type](input, options);
}

// --- Commentaire et motif ----------------------------------------------------

export type TextResult = { ok: true; value: string } | { ok: false; error: string };

export function validateComment(raw: unknown): TextResult {
  if (typeof raw !== "string") return { ok: false, error: "Écris un commentaire." };
  const text = stripControl(raw).trim();
  if (text === "") return { ok: false, error: "Écris un commentaire." };
  if (length(text) > COMMENT_MAX) {
    return { ok: false, error: `${COMMENT_MAX} caractères maximum (${length(text)} saisis).` };
  }
  return { ok: true, value: text };
}

/** Motif de refus optionnel : chaîne vide → `""` (à convertir en `null` par l'appelant). */
export function validateReason(raw: unknown): TextResult {
  if (raw === undefined || raw === null) return { ok: true, value: "" };
  if (typeof raw !== "string") return { ok: false, error: "Motif invalide." };
  const text = stripControl(raw).trim();
  if (length(text) > REASON_MAX) {
    return { ok: false, error: `${REASON_MAX} caractères maximum (${length(text)} saisis).` };
  }
  return { ok: true, value: text };
}
