import type { Metadata } from "next";
import { filterSpells, listSchools, parseSpellFilters, type RawSearchParams } from "@/lib/spells/filters";
import { listSpells } from "@/lib/spells/queries";
import type { SpellListItem } from "@/lib/spells/types";
import { SpellsListView } from "./SpellsListView";

export const metadata: Metadata = {
  title: "Sorts — Nexus JDR Bibliothèque",
  description: "Liste consultable des sorts D&D 5e du référentiel Nexus JDR.",
};

interface SpellsPageProps {
  searchParams: Promise<RawSearchParams>;
}

export default async function SpellsPage({ searchParams }: SpellsPageProps) {
  const resolvedSearchParams = await searchParams;
  const filters = parseSpellFilters(resolvedSearchParams);

  let allSpells: SpellListItem[] = [];
  let loadError = false;
  try {
    allSpells = await listSpells();
  } catch (error) {
    console.error("[sorts] échec du chargement des sorts depuis Supabase", error);
    loadError = true;
  }

  const schools = listSchools(allSpells);
  const filteredSpells = loadError ? [] : filterSpells(allSpells, filters);

  return (
    <SpellsListView
      spells={filteredSpells}
      totalCount={allSpells.length}
      schools={schools}
      query={filters.query ?? ""}
      level={filters.level}
      school={filters.school}
      loadError={loadError}
    />
  );
}
