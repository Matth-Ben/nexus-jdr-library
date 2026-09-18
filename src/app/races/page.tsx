import type { Metadata } from "next";
import { filterRaces, parseRaceFilters, type RawSearchParams } from "@/lib/races/filters";
import { listRaces } from "@/lib/races/queries";
import type { RaceListItem } from "@/lib/races/types";
import { RacesListView } from "./RacesListView";

export const metadata: Metadata = {
  title: "Races — Nexus JDR Bibliothèque",
  description: "Liste consultable des races D&D 5e du référentiel Nexus JDR.",
};

interface RacesPageProps {
  searchParams: Promise<RawSearchParams>;
}

export default async function RacesPage({ searchParams }: RacesPageProps) {
  const resolvedSearchParams = await searchParams;
  const filters = parseRaceFilters(resolvedSearchParams);

  let allRaces: RaceListItem[] = [];
  let loadError = false;
  try {
    allRaces = await listRaces();
  } catch (error) {
    console.error("[races] échec du chargement des races depuis Supabase", error);
    loadError = true;
  }

  const filteredRaces = loadError ? [] : filterRaces(allRaces, filters);

  return (
    <RacesListView
      races={filteredRaces}
      totalCount={allRaces.length}
      query={filters.query ?? ""}
      loadError={loadError}
    />
  );
}
