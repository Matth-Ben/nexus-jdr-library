import { length, rawValue, readText, stripControl, type FieldErrors, type RawInput, type TextOptions } from "./validation-core";

/**
 * Lecture des champs INDEXÉS d'un formulaire (`traits.0.name`,
 * `subraces.1.traits.0.description`) et reconstruction des listes.
 *
 * Règles communes à toutes les listes :
 *  - les index soumis sont triés numériquement ; les trous (0, 2, 5) sont
 *    tolérés (une requête forgée, ou un JS qui aurait sauté un index) ;
 *  - les lignes entièrement vides sont IGNORÉES (le formulaire sans JavaScript
 *    affiche toujours une ligne vide) ;
 *  - les erreurs sont clées par le RANG de la ligne dans l'ordre soumis
 *    (`traits.1.name`), pas par l'index brut : le formulaire, qui reconstruit
 *    ses lignes dans le même ordre, retrouve ainsi l'erreur près du bon champ.
 */

/** Au-delà, la requête est refusée sans tenter de l'interpréter. */
const MAX_SUBMITTED_ROWS = 200;

const INDEX_RE = "(0|[1-9][0-9]{0,3})";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function inputKeys(input: RawInput): string[] {
  if (typeof FormData !== "undefined" && input instanceof FormData) {
    return [...new Set(input.keys())];
  }
  return Object.keys(input as Record<string, unknown>);
}

/** Index bruts distincts des lignes `${prefix}.<n>.…`, triés. */
export function submittedIndexes(input: RawInput, prefix: string): number[] {
  const re = new RegExp(`^${escapeRegExp(prefix)}\\.${INDEX_RE}\\.`);
  const indexes = new Set<number>();
  for (const key of inputKeys(input)) {
    const match = re.exec(key);
    if (match) indexes.add(Number(match[1]));
  }
  return [...indexes].sort((a, b) => a - b);
}

/** Vrai si un champ `${prefix}.…` de la ligne contient autre chose que des blancs. */
export function hasContent(input: RawInput, rowPrefix: string): boolean {
  const start = `${rowPrefix}.`;
  for (const key of inputKeys(input)) {
    if (!key.startsWith(start)) continue;
    const value = rawValue(input, key);
    if (typeof value === "string" && stripControl(value).trim() !== "") return true;
    if (typeof value === "number" || value === true) return true;
  }
  return false;
}

/** Comme `readText`, mais l'erreur est enregistrée sous une autre clé (rang au lieu de l'index). */
export function readTextAt(
  input: RawInput,
  readName: string,
  errorName: string,
  errors: FieldErrors,
  options: TextOptions,
): string | undefined {
  const scratch: FieldErrors = {};
  const value = readText(input, readName, scratch, options);
  if (scratch[readName] !== undefined) errors[errorName] = scratch[readName];
  return value;
}

export interface RowRef {
  /** Préfixe de lecture (index brut soumis) : `traits.2`. */
  read: string;
  /** Préfixe des erreurs (rang) : `traits.1`. */
  error: string;
}

export interface ReadListOptions<T> {
  /** Préfixe des champs lus, ex. `subraces.0.traits`. */
  readPrefix: string;
  /** Préfixe des erreurs, ex. `subraces.0.traits` (rang du parent). */
  errorPrefix: string;
  min: number;
  max: number;
  /** Singulier / pluriel pour les messages : « trait » / « traits ». */
  noun: string;
  nounPlural: string;
  /** Lit une ligne non vide ; `undefined` si invalide (l'erreur est déjà enregistrée). */
  parseRow: (row: RowRef, errors: FieldErrors) => T | undefined;
  /** Clé de comparaison pour refuser les doublons, et champ qui porte l'erreur. */
  duplicate?: { key: (item: T) => string; field: string; label: (item: T) => string };
}

/**
 * Lit une liste de lignes répétables. Les erreurs de liste (trop/pas assez de
 * lignes, doublon) sont enregistrées sous `errorPrefix` ; celles d'une ligne
 * sous `${errorPrefix}.<rang>.<champ>`. Renvoie `[]` dès qu'une erreur existe.
 */
export function readList<T>(input: RawInput, errors: FieldErrors, options: ReadListOptions<T>): T[] {
  const { readPrefix, errorPrefix, min, max, noun, nounPlural } = options;
  const indexes = submittedIndexes(input, readPrefix);
  if (indexes.length > MAX_SUBMITTED_ROWS) {
    errors[errorPrefix] = `Trop de lignes envoyées pour cette liste (${nounPlural}).`;
    return [];
  }

  const rows = indexes
    .map((index, rank) => ({
      read: `${readPrefix}.${index}`,
      error: `${errorPrefix}.${rank}`,
    }))
    .filter((row) => hasContent(input, row.read));

  if (rows.length > max) {
    errors[errorPrefix] = `${max} ${nounPlural} au maximum (${rows.length} saisis).`;
    return [];
  }
  if (rows.length < min) {
    errors[errorPrefix] =
      min === 1 ? `Ajoute au moins un ${noun}.` : `Ajoute au moins ${min} ${nounPlural}.`;
    return [];
  }

  const items: T[] = [];
  let failed = false;
  const seen = new Map<string, true>();
  for (const row of rows) {
    const item = options.parseRow(row, errors);
    if (item === undefined) {
      failed = true;
      continue;
    }
    if (options.duplicate) {
      const key = options.duplicate.key(item).toLocaleLowerCase("fr");
      if (seen.has(key)) {
        errors[`${row.error}.${options.duplicate.field}`] =
          `« ${options.duplicate.label(item)} » est déjà présent dans la liste.`;
        failed = true;
        continue;
      }
      seen.set(key, true);
    }
    items.push(item);
  }
  return failed ? [] : items;
}

// --- Listes simples (un textarea, une valeur par ligne) -----------------------

export interface LinesOptions {
  max: number;
  itemMax: number;
  /** Ex. « langues », pour les messages. */
  noun: string;
}

/** Une valeur par ligne : lignes vides ignorées, doublons (insensibles à la casse) refusés. */
export function readLines(input: RawInput, name: string, errors: FieldErrors, options: LinesOptions): string[] {
  const raw = rawValue(input, name);
  if (raw === undefined || raw === null || raw === "") return [];
  if (typeof raw !== "string") {
    errors[name] = "Valeur invalide.";
    return [];
  }
  const lines = stripControl(raw)
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");

  if (lines.length > options.max) {
    errors[name] = `${options.max} ${options.noun} au maximum (${lines.length} saisies).`;
    return [];
  }
  const tooLong = lines.find((line) => length(line) > options.itemMax);
  if (tooLong !== undefined) {
    errors[name] = `Chaque ligne doit faire ${options.itemMax} caractères au maximum (« ${[...tooLong]
      .slice(0, 20)
      .join("")}… » : ${length(tooLong)}).`;
    return [];
  }
  const seen = new Set<string>();
  for (const line of lines) {
    const key = line.toLocaleLowerCase("fr");
    if (seen.has(key)) {
      errors[name] = `« ${line} » est en double.`;
      return [];
    }
    seen.add(key);
  }
  return lines;
}

// --- Entiers -----------------------------------------------------------------

export type IntResult = number | "empty" | "invalid";

/** Entier écrit simplement (`12`, `-2`, `+3`) ou nombre entier JS ; jamais de décimale ni d'exposant. */
export function readInteger(input: RawInput, name: string): IntResult {
  const value = rawValue(input, name);
  if (value === undefined || value === null) return "empty";
  if (typeof value === "number") return Number.isSafeInteger(value) ? value : "invalid";
  if (typeof value !== "string") return "invalid";
  const text = stripControl(value).trim();
  if (text === "") return "empty";
  if (!/^[+-]?[0-9]{1,6}$/.test(text)) return "invalid";
  const number = Number(text);
  return Object.is(number, -0) ? 0 : number;
}

/** Entier borné : erreur `errorName` si absent (quand `required`), invalide ou hors bornes. */
export function readBoundedInt(
  input: RawInput,
  readName: string,
  errorName: string,
  errors: FieldErrors,
  options: { min: number; max: number; required?: boolean; requiredMessage?: string; label: string },
): number | undefined {
  const value = readInteger(input, readName);
  if (value === "empty") {
    if (options.required) errors[errorName] = options.requiredMessage ?? `${options.label} : valeur obligatoire.`;
    return undefined;
  }
  if (value === "invalid" || value < options.min || value > options.max) {
    errors[errorName] = `${options.label} : un entier entre ${options.min} et ${options.max} est attendu.`;
    return undefined;
  }
  return value;
}

/** Nombre d'octets du texte que Postgres produit pour un jsonb (`{"a": 1, "b": [1, 2]}`). */
export function jsonbTextBytes(value: unknown): number {
  return new TextEncoder().encode(jsonbText(value)).length;
}

function jsonbText(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(jsonbText).join(", ")}]`;
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([key, item]) => `${JSON.stringify(key)}: ${jsonbText(item)}`,
    );
    return `{${entries.join(", ")}}`;
  }
  return JSON.stringify(value) ?? "null";
}
