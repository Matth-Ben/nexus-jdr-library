import type { Metadata } from "next";
import { filterClasses, parseClassFilters, type RawSearchParams } from "@/lib/classes/filters";
import { listClasses } from "@/lib/classes/queries";
import type { ClassListItem } from "@/lib/classes/types";
import { ClassesListView } from "./ClassesListView";

export const metadata: Metadata = {
  title: "Classes — Nexus JDR Bibliothèque",
  description: "Liste consultable des classes D&D 5e du référentiel Nexus JDR.",
};

interface ClassesPageProps {
  searchParams: Promise<RawSearchParams>;
}

export default async function ClassesPage({ searchParams }: ClassesPageProps) {
  const resolvedSearchParams = await searchParams;
  const filters = parseClassFilters(resolvedSearchParams);

  let allClasses: ClassListItem[] = [];
  let loadError = false;
  try {
    allClasses = await listClasses();
  } catch (error) {
    console.error("[classes] échec du chargement des classes depuis Supabase", error);
    loadError = true;
  }

  const filteredClasses = loadError ? [] : filterClasses(allClasses, filters);

  return (
    <ClassesListView
      classes={filteredClasses}
      totalCount={allClasses.length}
      query={filters.query ?? ""}
      loadError={loadError}
    />
  );
}
