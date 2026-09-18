import { cache } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { mergeClassDetail, mergeClassListItems } from "./translations";
import type {
  ClassDetail,
  ClassFeatureRow,
  ClassListItem,
  ClassRow,
  SubclassRow,
  TranslationRow,
} from "./types";

/** Colonnes `classes` nécessaires à la liste (pas les maîtrises/choix, réservés au détail). */
const CLASS_LIST_COLUMNS = "id, source, hit_die";
const CLASS_DETAIL_COLUMNS =
  "id, source, hit_die, primary_abilities, saving_throw_proficiencies, armor_proficiencies, weapon_proficiencies, tool_proficiencies, skill_choices";
const SUBCLASS_COLUMNS = "id, class_id, available_from_level";
const CLASS_FEATURE_COLUMNS = "id, class_id, subclass_id, level, choice_type, uses_per_rest";

const LOCALE = "fr";

/** Erreur levée quand une requête Supabase échoue (réseau, RLS, etc.). */
export class ClassFetchError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ClassFetchError";
  }
}

async function fetchTranslationRows(
  entityType: "class" | "subclass" | "class_feature",
  entityIds: readonly string[],
  fieldName: "name" | "description",
): Promise<TranslationRow[]> {
  if (entityIds.length === 0) {
    return [];
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("translations")
    .select("entity_id, value")
    .eq("entity_type", entityType)
    .eq("field_name", fieldName)
    .eq("locale", LOCALE)
    .in("entity_id", entityIds)
    .overrideTypes<TranslationRow[], { merge: false }>();

  if (error) {
    throw new ClassFetchError(
      `Échec de la résolution des traductions (${entityType}/${fieldName}) : ${error.message}`,
      { cause: error },
    );
  }

  return data ?? [];
}

/**
 * Liste toutes les classes du référentiel (fetch complet, filtrage en
 * mémoire côté appelant — une douzaine de classes ne justifie pas de
 * pagination serveur, voir `queries.ts` de `/sorts` pour le même choix).
 */
export async function listClasses(): Promise<ClassListItem[]> {
  const supabase = getSupabaseClient();
  const { data: classRows, error } = await supabase
    .from("classes")
    .select(CLASS_LIST_COLUMNS)
    .overrideTypes<ClassRow[], { merge: false }>();

  if (error) {
    throw new ClassFetchError(`Échec du chargement des classes : ${error.message}`, {
      cause: error,
    });
  }

  const classes = classRows ?? [];
  if (classes.length === 0) {
    return [];
  }

  const nameRows = await fetchTranslationRows(
    "class",
    classes.map((klass) => String(klass.id)),
    "name",
  );

  return mergeClassListItems(classes, nameRows).sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

/**
 * Récupère la fiche complète d'une classe par id (avec ses sous-classes et
 * ses aptitudes de classe propres — `class_id = id AND subclass_id IS
 * NULL`, pas celles des sous-classes), ou `null` si introuvable.
 *
 * Enveloppée dans `React.cache` : `generateMetadata` et le composant de
 * page appellent tous les deux cette fonction pour le même id lors du même
 * rendu serveur — la déduplication évite une deuxième requête Supabase
 * identique (même pattern que `getSpellById`).
 */
export const getClassById = cache(async function getClassById(
  id: number,
): Promise<ClassDetail | null> {
  const supabase = getSupabaseClient();
  const { data: classRow, error } = await supabase
    .from("classes")
    .select(CLASS_DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<ClassRow, { merge: false }>();

  if (error) {
    throw new ClassFetchError(`Échec du chargement de la classe #${id} : ${error.message}`, {
      cause: error,
    });
  }

  if (!classRow) {
    return null;
  }

  const entityId = String(classRow.id);

  const [nameRows, descriptionRows, subclassRows, featureRows] = await Promise.all([
    fetchTranslationRows("class", [entityId], "name"),
    fetchTranslationRows("class", [entityId], "description"),
    fetchSubclasses(id),
    fetchOwnClassFeatures(id),
  ]);

  const subclassNameRows = await fetchTranslationRows(
    "subclass",
    subclassRows.map((subclass) => String(subclass.id)),
    "name",
  );

  const featureIds = featureRows.map((feature) => String(feature.id));
  const [featureNameRows, featureDescriptionRows] = await Promise.all([
    fetchTranslationRows("class_feature", featureIds, "name"),
    fetchTranslationRows("class_feature", featureIds, "description"),
  ]);

  return mergeClassDetail(
    classRow,
    nameRows,
    descriptionRows,
    featureRows,
    featureNameRows,
    featureDescriptionRows,
    subclassRows,
    subclassNameRows,
  );
});

async function fetchSubclasses(classId: number): Promise<SubclassRow[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("subclasses")
    .select(SUBCLASS_COLUMNS)
    .eq("class_id", classId)
    .overrideTypes<SubclassRow[], { merge: false }>();

  if (error) {
    throw new ClassFetchError(
      `Échec du chargement des sous-classes de la classe #${classId} : ${error.message}`,
      { cause: error },
    );
  }

  return data ?? [];
}

/**
 * Aptitudes de classe propres à la classe elle-même uniquement
 * (`class_id = classId AND subclass_id IS NULL`) — pas celles des
 * sous-classes, pour rester lisible sur la fiche détail d'une classe.
 */
async function fetchOwnClassFeatures(classId: number): Promise<ClassFeatureRow[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("class_features")
    .select(CLASS_FEATURE_COLUMNS)
    .eq("class_id", classId)
    .is("subclass_id", null)
    .overrideTypes<ClassFeatureRow[], { merge: false }>();

  if (error) {
    throw new ClassFetchError(
      `Échec du chargement des aptitudes de la classe #${classId} : ${error.message}`,
      { cause: error },
    );
  }

  return data ?? [];
}
