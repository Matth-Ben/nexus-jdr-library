import type { Metadata } from "next";
import { filterFeats, parseFeatFilters, type RawSearchParams } from "@/lib/feats/filters";
import { listFeats } from "@/lib/feats/queries";
import type { FeatListItem } from "@/lib/feats/types";
import { FeatsListView } from "./FeatsListView";

export const metadata: Metadata = {
  title: "Dons — Nexus JDR Bibliothèque",
  description: "Liste consultable des dons D&D 5e du référentiel Nexus JDR.",
};

interface FeatsPageProps {
  searchParams: Promise<RawSearchParams>;
}

export default async function FeatsPage({ searchParams }: FeatsPageProps) {
  const resolvedSearchParams = await searchParams;
  const filters = parseFeatFilters(resolvedSearchParams);

  let allFeats: FeatListItem[] = [];
  let loadError = false;
  try {
    allFeats = await listFeats();
  } catch (error) {
    console.error("[dons] échec du chargement des dons depuis Supabase", error);
    loadError = true;
  }

  const filteredFeats = loadError ? [] : filterFeats(allFeats, filters);

  return (
    <FeatsListView
      feats={filteredFeats}
      totalCount={allFeats.length}
      query={filters.query ?? ""}
      loadError={loadError}
    />
  );
}
