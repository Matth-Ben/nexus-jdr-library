/**
 * Briques communes des validateurs de propositions (lecture défensive d'un
 * `FormData` ou d'un objet). Aucune règle propre à un type de contenu ici.
 */

// --- Types de résultat ------------------------------------------------------

export type FieldErrors = Record<string, string>;

export type ValidationResult =
  | { ok: true; title: string; payload: Record<string, unknown> }
  | { ok: false; errors: FieldErrors };

/** Entrée brute : un `FormData` ou un objet quelconque (JSON, tests). */
export type RawInput = FormData | Record<string, unknown>;

// --- Lecture défensive -------------------------------------------------------

export function rawValue(input: RawInput, name: string): unknown {
  if (typeof FormData !== "undefined" && input instanceof FormData) {
    const value = input.get(name);
    return typeof value === "string" ? value : undefined;
  }
  return (input as Record<string, unknown>)[name];
}

export function stripControl(value: string): string {
  // U+0000 est refusé par jsonb/text côté Postgres.
  return value.replaceAll("\u0000", "");
}

export function length(value: string): number {
  return [...value].length;
}

export interface TextOptions {
  required?: boolean;
  max: number;
  requiredMessage?: string;
}

/** Texte trimé ; `undefined` + erreur enregistrée si invalide, `""` si vide et optionnel. */
export function readText(input: RawInput, name: string, errors: FieldErrors, options: TextOptions): string | undefined {
  const value = rawValue(input, name);
  if (value === undefined || value === null) {
    if (options.required) {
      errors[name] = options.requiredMessage ?? "Ce champ est obligatoire.";
      return undefined;
    }
    return "";
  }
  if (typeof value !== "string") {
    errors[name] = "Valeur invalide.";
    return undefined;
  }
  const text = stripControl(value).trim();
  if (text === "") {
    if (options.required) {
      errors[name] = options.requiredMessage ?? "Ce champ est obligatoire.";
      return undefined;
    }
    return "";
  }
  if (length(text) > options.max) {
    errors[name] = `${options.max} caractères maximum (${length(text)} saisis).`;
    return undefined;
  }
  return text;
}

export function readBool(input: RawInput, name: string, errors: FieldErrors, key = name): boolean {
  const value = rawValue(input, name);
  if (value === undefined || value === null || value === "" || value === false) {
    return false;
  }
  if (value === true) {
    return true;
  }
  if (typeof value === "string") {
    const lowered = value.trim().toLowerCase();
    if (lowered === "on" || lowered === "true" || lowered === "1") return true;
    if (lowered === "off" || lowered === "false" || lowered === "0") return false;
  }
  errors[key] = "Valeur invalide.";
  return false;
}

export function readEnum<T extends string>(
  input: RawInput,
  name: string,
  allowed: readonly T[],
  errors: FieldErrors,
  requiredMessage: string,
): T | undefined {
  const value = rawValue(input, name);
  if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
    errors[name] = requiredMessage;
    return undefined;
  }
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value.trim())) {
    errors[name] = "Valeur non reconnue.";
    return undefined;
  }
  return value.trim() as T;
}

