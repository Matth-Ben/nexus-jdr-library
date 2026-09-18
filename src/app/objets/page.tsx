import type { Metadata } from "next";
import { filterItems, parseItemFilters, type RawSearchParams } from "@/lib/items/filters";
import { listItems } from "@/lib/items/queries";
import type { ItemListItem } from "@/lib/items/types";
import { ItemsListView } from "./ItemsListView";

export const metadata: Metadata = {
  title: "Objets — Nexus JDR Bibliothèque",
  description: "Liste consultable des objets D&D 5e du référentiel Nexus JDR.",
};

interface ItemsPageProps {
  searchParams: Promise<RawSearchParams>;
}

export default async function ItemsPage({ searchParams }: ItemsPageProps) {
  const resolvedSearchParams = await searchParams;
  const filters = parseItemFilters(resolvedSearchParams);

  let allItems: ItemListItem[] = [];
  let loadError = false;
  try {
    allItems = await listItems();
  } catch (error) {
    console.error("[objets] échec du chargement des objets depuis Supabase", error);
    loadError = true;
  }

  const filteredItems = loadError ? [] : filterItems(allItems, filters);

  return (
    <ItemsListView
      items={filteredItems}
      totalCount={allItems.length}
      query={filters.query ?? ""}
      category={filters.category}
      loadError={loadError}
    />
  );
}
