import { cache } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { mergeSpellDetail, mergeSpellListItems } from "./translations";
import type { SpellDetail, SpellListItem, SpellRow, TranslationRow } from "./types";

/** Colonnes `spells` nécessaires à la liste (pas `range`/`components`/`duration`, réservées au détail). */
const SPELL_LIST_COLUMNS = "id, level, school, casting_time, concentration";
const SPELL_DETAIL_COLUMNS =
  "id, level, school, casting_time, range, components, duration, concentration";

const LOCALE = "fr";

/** Erreur levée quand la requête Supabase échoue (réseau, RLS, etc.). */
export class SpellFetchError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "SpellFetchError";
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
    .eq("entity_type", "spell")
    .eq("field_name", fieldName)
    .eq("locale", LOCALE)
    .in("entity_id", entityIds)
    .overrideTypes<TranslationRow[], { merge: false }>();

  if (error) {
    throw new SpellFetchError(
      `Échec de la résolution des traductions de sorts (${fieldName}) : ${error.message}`,
      { cause: error },
    );
  }

  return data ?? [];
}

/**
 * Liste tous les sorts du référentiel (fetch complet, filtrage en mémoire
 * côté appelant — voir `docs/cahier-des-charges/03-fonctionnalites.md`,
 * le volume ~477 lignes ne justifie pas de pagination serveur).
 */
export async function listSpells(): Promise<SpellListItem[]> {
  const supabase = getSupabaseClient();
  const { data: spellRows, error } = await supabase
    .from("spells")
    .select(SPELL_LIST_COLUMNS)
    .order("level", { ascending: true })
    .overrideTypes<SpellRow[], { merge: false }>();

  if (error) {
    throw new SpellFetchError(`Échec du chargement des sorts : ${error.message}`, {
      cause: error,
    });
  }

  const spells = spellRows ?? [];
  if (spells.length === 0) {
    return [];
  }

  const nameRows = await fetchTranslationRows(
    spells.map((spell) => String(spell.id)),
    "name",
  );

  return mergeSpellListItems(spells, nameRows).sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

/**
 * Récupère la fiche complète d'un sort par id, ou `null` si introuvable.
 *
 * Enveloppée dans `React.cache` : `generateMetadata` et le composant de
 * page appellent tous les deux cette fonction pour le même id lors du même
 * rendu serveur — la déduplication évite une deuxième requête Supabase
 * identique (pattern recommandé par Next.js App Router).
 */
export const getSpellById = cache(async function getSpellById(
  id: number,
): Promise<SpellDetail | null> {
  const supabase = getSupabaseClient();
  const { data: spellRow, error } = await supabase
    .from("spells")
    .select(SPELL_DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<SpellRow, { merge: false }>();

  if (error) {
    throw new SpellFetchError(`Échec du chargement du sort #${id} : ${error.message}`, {
      cause: error,
    });
  }

  if (!spellRow) {
    return null;
  }

  const entityId = String(spellRow.id);
  const [nameRows, descriptionRows] = await Promise.all([
    fetchTranslationRows([entityId], "name"),
    fetchTranslationRows([entityId], "description"),
  ]);

  return mergeSpellDetail(spellRow, nameRows, descriptionRows);
});
