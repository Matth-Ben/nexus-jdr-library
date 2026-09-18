import type {
  ClassDetail,
  ClassFeatureDetail,
  ClassFeatureRow,
  ClassListItem,
  ClassRow,
  ClassSkillChoices,
  SubclassRow,
  SubclassSummary,
  ToolProficiencyChoice,
  TranslationRow,
} from "./types";

/** Valeur affichée quand une traduction attendue est absente en base. */
const MISSING_NAME = "(nom manquant)";
const MISSING_TEXT = "(non renseigné)";
/** Valeur affichée quand une liste de maîtrises/aptitudes est vide (cas légitime, ex. mage sans maîtrise d'armure). */
const EMPTY_LIST = "Aucune";

/**
 * Indexe des lignes `translations` par `entity_id` — fonction pure, aucune
 * dépendance réseau, réutilisée pour les noms comme pour les descriptions,
 * quel que soit l'`entity_type` interrogé en amont.
 */
export function buildTranslationMap(
  rows: readonly TranslationRow[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    map.set(row.entity_id, row.value);
  }
  return map;
}

/** Formate une liste de chaînes (maîtrises, caractéristiques...) en texte lisible. */
export function formatStringList(values: readonly string[] | null | undefined): string {
  if (!values || values.length === 0) {
    return EMPTY_LIST;
  }
  return values.join(", ");
}

const ABILITY_LABELS: Record<string, string> = {
  str: "Force",
  dex: "Dextérité",
  con: "Constitution",
  int: "Intelligence",
  wis: "Sagesse",
  cha: "Charisme",
};

/** "Force", "Dextérité"... à partir du code stocké en base (`str`, `dex`...). */
export function formatAbilityList(codes: readonly string[] | null | undefined): string[] {
  return (codes ?? []).map((code) => ABILITY_LABELS[code] ?? code);
}

const TOOL_CHOICE_LABELS: Record<string, { one: string; many: string }> = {
  instrument: { one: "instrument de musique", many: "instruments de musique" },
  outils_artisan_ou_instrument: {
    one: "outil d'artisan ou instrument de musique",
    many: "outils d'artisan ou instruments de musique",
  },
};

function humanize(code: string): string {
  return code.replace(/_/g, " ");
}

/**
 * Normalise `classes.tool_proficiencies` (liste de noms, ou choix
 * `{type, count}` pour barde/moine) en liste de libellés affichables.
 */
export function normalizeToolProficiencies(
  raw: readonly string[] | ToolProficiencyChoice | null | undefined,
): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((item): item is string => typeof item === "string");
  }
  if (raw && typeof raw === "object" && "count" in raw) {
    const choice = raw as ToolProficiencyChoice;
    const count = choice.count;
    if (typeof count === "number" && count > 0) {
      const labels = choice.type ? TOOL_CHOICE_LABELS[choice.type] : undefined;
      const noun = labels
        ? count === 1
          ? labels.one
          : labels.many
        : choice.type
          ? humanize(choice.type)
          : "outil";
      return [`${count} ${noun} au choix`];
    }
  }
  return [];
}

/**
 * Formate `classes.skill_choices` (jsonb `{count?, choices?}`) en une
 * consigne lisible ("Choisissez 2 compétences parmi : Arcanes, Histoire...")
 * — défensif si `count` et/ou `choices` sont absents ; `choices: "toutes"`
 * (barde) donne "parmi toutes les compétences".
 */
export function formatSkillChoices(
  skillChoices: ClassSkillChoices | null | undefined,
): string {
  const count = skillChoices?.count;
  const choices = skillChoices?.choices;
  const hasCount = typeof count === "number" && count > 0;
  const allSkills = choices === "toutes";
  const hasList = Array.isArray(choices) && choices.length > 0;

  if (!hasCount && !allSkills && !hasList) {
    return MISSING_TEXT;
  }

  const countLabel = hasCount
    ? `Choisissez ${count} compétence${count === 1 ? "" : "s"}`
    : "Choisissez des compétences";

  if (allSkills) {
    return `${countLabel} parmi toutes les compétences`;
  }
  return hasList ? `${countLabel} parmi : ${choices.join(", ")}` : countLabel;
}

const REST_LABELS: Record<string, string> = {
  repos_court: "repos court",
  repos_long: "repos long",
};

/**
 * Résumé de `class_features.uses_per_rest` (jsonb nullable), forme réelle
 * vérifiée en base le 2026-09-18 : `{amount: number | null, rest_type:
 * "repos_court" | "repos_long"}`. `amount` nul = nombre d'utilisations non
 * fixe (ex. dépend d'une caractéristique), seul le type de repos est alors
 * affiché. Toute autre forme retombe sur `null` (pas d'affichage).
 */
export function formatUsesPerRest(value: unknown): string | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const rest = typeof record.rest_type === "string" ? record.rest_type : null;
  if (rest === null) {
    return null;
  }
  const restLabel = REST_LABELS[rest] ?? humanize(rest);
  const amount = record.amount;
  if (typeof amount === "number" && Number.isFinite(amount)) {
    return `${amount} utilisation${amount > 1 ? "s" : ""} par ${restLabel}`;
  }
  return `Récupéré après un ${restLabel}`;
}

const CHOICE_TYPE_LABELS: Record<string, string> = {
  amelioration_caracteristiques: "Amélioration de caractéristiques",
  ancetre_draconique: "Ancêtre draconique",
  discipline_elementaire: "Discipline élémentaire",
  ennemi_jure: "Ennemi juré",
  expertise: "Expertise",
  invocation: "Invocation",
  manoeuvre: "Manœuvre",
  metamagie: "Métamagie",
  pacte: "Pacte",
  sort_domaine: "Sort de domaine",
  sort_mineur_bonus: "Sort mineur bonus",
  sous_classe: "Sous-classe",
  style_combat: "Style de combat",
};

/** Libellé FR de `class_features.choice_type` (repli : code humanisé). */
export function formatChoiceType(code: string): string {
  return CHOICE_TYPE_LABELS[code] ?? humanize(code);
}

/**
 * Fusionne les lignes `classes` avec les noms résolus depuis `translations`
 * (`entity_type='class'`, `field_name='name'`, `locale='fr'`) — appariement
 * par `entity_id === String(class.id)`, comme côté app mobile et `/sorts`.
 */
export function mergeClassListItems(
  classRows: readonly ClassRow[],
  nameRows: readonly TranslationRow[],
): ClassListItem[] {
  const names = buildTranslationMap(nameRows);
  return classRows.map((row) => toClassListItem(row, names));
}

function toClassListItem(row: ClassRow, names: Map<string, string>): ClassListItem {
  return {
    id: row.id,
    name: names.get(String(row.id)) ?? MISSING_NAME,
    hitDie: row.hit_die,
    source: row.source,
  };
}

/**
 * Fusionne une ligne `class_features` avec son nom/sa description, pour la
 * fiche détail d'une classe.
 */
export function mergeClassFeature(
  row: ClassFeatureRow,
  names: Map<string, string>,
  descriptions: Map<string, string>,
): ClassFeatureDetail {
  const entityId = String(row.id);
  return {
    id: row.id,
    name: names.get(entityId) ?? MISSING_NAME,
    description: descriptions.get(entityId) ?? MISSING_TEXT,
    level: row.level,
    choiceType: row.choice_type ? formatChoiceType(row.choice_type) : null,
    usesPerRestLabel: formatUsesPerRest(row.uses_per_rest),
  };
}

/** Fusionne des lignes `class_features`, triées par niveau croissant. */
export function mergeClassFeatures(
  rows: readonly ClassFeatureRow[],
  nameRows: readonly TranslationRow[],
  descriptionRows: readonly TranslationRow[],
): ClassFeatureDetail[] {
  const names = buildTranslationMap(nameRows);
  const descriptions = buildTranslationMap(descriptionRows);
  return rows
    .map((row) => mergeClassFeature(row, names, descriptions))
    .sort((a, b) => a.level - b.level);
}

/** Fusionne des lignes `subclasses` avec leurs noms, pour la fiche détail d'une classe. */
export function mergeSubclassSummaries(
  rows: readonly SubclassRow[],
  nameRows: readonly TranslationRow[],
): SubclassSummary[] {
  const names = buildTranslationMap(nameRows);
  return rows
    .map((row) => ({
      id: row.id,
      name: names.get(String(row.id)) ?? MISSING_NAME,
      availableFromLevel: row.available_from_level,
    }))
    .sort((a, b) => a.availableFromLevel - b.availableFromLevel);
}

/**
 * Fusionne une ligne `classes` unique avec son nom, sa description, ses
 * sous-classes et ses aptitudes de classe propres (déjà filtrées côté
 * requête sur `class_id = X AND subclass_id IS NULL`), pour la fiche
 * détail `/classes/[id]`.
 */
export function mergeClassDetail(
  row: ClassRow,
  nameRows: readonly TranslationRow[],
  descriptionRows: readonly TranslationRow[],
  featureRows: readonly ClassFeatureRow[],
  featureNameRows: readonly TranslationRow[],
  featureDescriptionRows: readonly TranslationRow[],
  subclassRows: readonly SubclassRow[],
  subclassNameRows: readonly TranslationRow[],
): ClassDetail {
  const names = buildTranslationMap(nameRows);
  const descriptions = buildTranslationMap(descriptionRows);

  return {
    ...toClassListItem(row, names),
    description: descriptions.get(String(row.id)) ?? MISSING_TEXT,
    primaryAbilities: formatAbilityList(row.primary_abilities),
    savingThrowProficiencies: formatAbilityList(row.saving_throw_proficiencies),
    armorProficiencies: row.armor_proficiencies,
    weaponProficiencies: row.weapon_proficiencies,
    toolProficiencies: normalizeToolProficiencies(row.tool_proficiencies),
    skillChoicesLabel: formatSkillChoices(row.skill_choices),
    features: mergeClassFeatures(featureRows, featureNameRows, featureDescriptionRows),
    subclasses: mergeSubclassSummaries(subclassRows, subclassNameRows),
  };
}
