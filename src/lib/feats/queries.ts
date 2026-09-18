import { cache } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { mergeFeatDetail, mergeFeatListItems } from "./translations";
import type { FeatDetail, FeatListItem, FeatRow, TranslationRow } from "./types";

const FEAT_COLUMNS = "id, prerequisites";

const LOCALE = "fr";

/** Erreur levée quand la requête Supabase échoue (réseau, RLS, etc.). */
export class FeatFetchError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "FeatFetchError";
  }
}

async function fetchTranslationRows(
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
    .eq("entity_type", "feat")
    .eq("field_name", fieldName)
    .eq("locale", LOCALE)
    .in("entity_id", entityIds)
    .overrideTypes<TranslationRow[], { merge: false }>();

  if (error) {
    throw new FeatFetchError(
      `Échec de la résolution des traductions de dons (${fieldName}) : ${error.message}`,
      { cause: error },
    );
  }

  return data ?? [];
}

/**
 * Liste tous les dons du référentiel (fetch complet, filtrage en mémoire
 * côté appelant — volume (~42 lignes) trivial, ne justifie aucune
 * pagination serveur, même raisonnement que `listSpells`).
 */
export async function listFeats(): Promise<FeatListItem[]> {
  const supabase = getSupabaseClient();
  const { data: featRows, error } = await supabase
    .from("feats")
    .select(FEAT_COLUMNS)
    .overrideTypes<FeatRow[], { merge: false }>();

  if (error) {
    throw new FeatFetchError(`Échec du chargement des dons : ${error.message}`, {
      cause: error,
    });
  }

  const feats = featRows ?? [];
  if (feats.length === 0) {
    return [];
  }

  const nameRows = await fetchTranslationRows(
    feats.map((feat) => String(feat.id)),
    "name",
  );

  return mergeFeatListItems(feats, nameRows).sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

/**
 * Récupère la fiche complète d'un don par id, ou `null` si introuvable.
 *
 * Enveloppée dans `React.cache` : `generateMetadata` et le composant de
 * page appellent tous les deux cette fonction pour le même id lors du même
 * rendu serveur — la déduplication évite une deuxième requête Supabase
 * identique (même pattern que `getSpellById`).
 */
export const getFeatById = cache(async function getFeatById(
  id: number,
): Promise<FeatDetail | null> {
  const supabase = getSupabaseClient();
  const { data: featRow, error } = await supabase
    .from("feats")
    .select(FEAT_COLUMNS)
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<FeatRow, { merge: false }>();

  if (error) {
    throw new FeatFetchError(`Échec du chargement du don #${id} : ${error.message}`, {
      cause: error,
    });
  }

  if (!featRow) {
    return null;
  }

  const entityId = String(featRow.id);
  const [nameRows, descriptionRows] = await Promise.all([
    fetchTranslationRows([entityId], "name"),
    fetchTranslationRows([entityId], "description"),
  ]);

  return mergeFeatDetail(featRow, nameRows, descriptionRows);
});
