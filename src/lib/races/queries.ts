import { cache } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { mergeRaceDetail, mergeRaceListItems } from "./translations";
import type { RaceDetail, RaceListItem, RaceRow, SubraceRow, TranslationRow } from "./types";

/** Colonnes `races` nécessaires à la liste (pas `ability_bonuses`/`traits`/`languages`, réservées au détail). */
const RACE_LIST_COLUMNS = "id, source, size, speed";
const RACE_DETAIL_COLUMNS = "id, source, size, speed, ability_bonuses, traits, languages";
const SUBRACE_COLUMNS = "id, race_id, ability_bonuses, traits";

const LOCALE = "fr";

/** Erreur levée quand la requête Supabase échoue (réseau, RLS, etc.). */
export class RaceFetchError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "RaceFetchError";
  }
}

async function fetchNameTranslations(
  entityIds: readonly string[],
  entityType: "race" | "subrace",
): Promise<TranslationRow[]> {
  if (entityIds.length === 0) {
    return [];
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("translations")
    .select("entity_id, value")
    .eq("entity_type", entityType)
    .eq("field_name", "name")
    .eq("locale", LOCALE)
    .in("entity_id", entityIds)
    .overrideTypes<TranslationRow[], { merge: false }>();

  if (error) {
    throw new RaceFetchError(
      `Échec de la résolution des traductions de ${entityType === "race" ? "races" : "sous-races"} : ${error.message}`,
      { cause: error },
    );
  }

  return data ?? [];
}

/**
 * Liste toutes les races du référentiel (fetch complet, filtrage en mémoire
 * côté appelant — une douzaine de races seulement, pas de pagination
 * serveur nécessaire).
 */
export async function listRaces(): Promise<RaceListItem[]> {
  const supabase = getSupabaseClient();
  const { data: raceRows, error } = await supabase
    .from("races")
    .select(RACE_LIST_COLUMNS)
    .overrideTypes<RaceRow[], { merge: false }>();

  if (error) {
    throw new RaceFetchError(`Échec du chargement des races : ${error.message}`, {
      cause: error,
    });
  }

  const races = raceRows ?? [];
  if (races.length === 0) {
    return [];
  }

  const nameRows = await fetchNameTranslations(
    races.map((race) => String(race.id)),
    "race",
  );

  return mergeRaceListItems(races, nameRows).sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

/**
 * Récupère la fiche complète d'une race par id, avec ses sous-races, ou
 * `null` si introuvable.
 *
 * Enveloppée dans `React.cache` : `generateMetadata` et le composant de
 * page appellent tous les deux cette fonction pour le même id lors du même
 * rendu serveur — la déduplication évite une deuxième requête Supabase
 * identique (pattern recommandé par Next.js App Router).
 */
export const getRaceById = cache(async function getRaceById(
  id: number,
): Promise<RaceDetail | null> {
  const supabase = getSupabaseClient();
  const { data: raceRow, error } = await supabase
    .from("races")
    .select(RACE_DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<RaceRow, { merge: false }>();

  if (error) {
    throw new RaceFetchError(`Échec du chargement de la race #${id} : ${error.message}`, {
      cause: error,
    });
  }

  if (!raceRow) {
    return null;
  }

  const { data: subraceRows, error: subraceError } = await supabase
    .from("subraces")
    .select(SUBRACE_COLUMNS)
    .eq("race_id", id)
    .overrideTypes<SubraceRow[], { merge: false }>();

  if (subraceError) {
    throw new RaceFetchError(
      `Échec du chargement des sous-races de la race #${id} : ${subraceError.message}`,
      { cause: subraceError },
    );
  }

  const subraces = subraceRows ?? [];
  const entityId = String(raceRow.id);
  const [raceNameRows, subraceNameRows] = await Promise.all([
    fetchNameTranslations([entityId], "race"),
    fetchNameTranslations(
      subraces.map((subrace) => String(subrace.id)),
      "subrace",
    ),
  ]);

  return mergeRaceDetail(raceRow, subraces, raceNameRows, subraceNameRows);
});
