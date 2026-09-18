import type {
  ClassDetail,
  ClassFeatureDetail,
  ClassFeatureRow,
  ClassListItem,
  ClassRow,
  ClassSkillChoices,
  SubclassRow,
  SubclassSummary,
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

/**
 * Formate `classes.skill_choices` (jsonb `{count?, options?}`) en une
 * consigne lisible ("Choisissez 2 parmi : Arcane, Histoire...") — défensif
 * si `count` et/ou `options` sont absents, forme non garantie en base.
 */
export function formatSkillChoices(
  skillChoices: ClassSkillChoices | null | undefined,
): string {
  const count = skillChoices?.count;
  const options = skillChoices?.options;
  const hasCount = typeof count === "number" && count > 0;
  const hasOptions = Array.isArray(options) && options.length > 0;

  if (!hasCount && !hasOptions) {
    return MISSING_TEXT;
  }

  const countLabel = hasCount
    ? `Choisissez ${count} compétence${count === 1 ? "" : "s"}`
    : "Choisissez des compétences";

  return hasOptions ? `${countLabel} parmi : ${options.join(", ")}` : countLabel;
}

/**
 * Résumé défensif de `class_features.uses_per_rest` (jsonb sans forme
 * garantie, potentiellement `null`). Ne suppose rien de la structure au-delà
 * d'un nombre brut ou d'un objet `{count, per}` optionnel — toute autre
 * forme retombe sur `null` (pas d'affichage) plutôt que de planter.
 */
export function formatUsesPerRest(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return `Utilisable ${value} fois par repos`;
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const count = record.count;
    const per = record.per;
    if (typeof count === "number" && typeof per === "string" && per !== "") {
      return `Utilisable ${count} fois par ${per}`;
    }
    if (typeof count === "number") {
      return `Utilisable ${count} fois par repos`;
    }
  }
  return null;
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
    choiceType: row.choice_type,
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
    primaryAbilities: row.primary_abilities,
    savingThrowProficiencies: row.saving_throw_proficiencies,
    armorProficiencies: row.armor_proficiencies,
    weaponProficiencies: row.weapon_proficiencies,
    toolProficiencies: row.tool_proficiencies,
    skillChoicesLabel: formatSkillChoices(row.skill_choices),
    features: mergeClassFeatures(featureRows, featureNameRows, featureDescriptionRows),
    subclasses: mergeSubclassSummaries(subclassRows, subclassNameRows),
  };
}
