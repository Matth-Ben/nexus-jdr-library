import type { Metadata } from "next";
import { Suspense } from "react";
import { DetailPanel } from "@/components/DetailPanel";
import { closeHref, parseOpenId } from "@/lib/panel";
import { getItemById, listItems } from "@/lib/items/queries";
import { ItemDetailView } from "./ItemDetailView";
import { filterItems, parseItemFilters, type RawSearchParams } from "@/lib/items/filters";
import type { ItemListItem } from "@/lib/items/types";
import { ItemsListView } from "./ItemsListView";

export const metadata: Metadata = {
  title: "Objets — Nexus JDR Bibliothèque",
  description: "Liste consultable des objets D&D 5e du référentiel Nexus JDR.",
};

interface ItemsPageProps {
  searchParams: Promise<RawSearchParams>;
}

async function PanelContent({ id }: { id: number }) {
  let item: Awaited<ReturnType<typeof getItemById>> = null;
  let loadFailed = false;
  try {
    item = await getItemById(id);
  } catch (error) {
    console.error("[objets] échec du chargement d'une fiche", error);
    loadFailed = true;
  }

  if (loadFailed) {
    return <p role="alert">Impossible de charger cette fiche pour le moment.</p>;
  }
  if (!item) {
    return <p>Fiche introuvable.</p>;
  }
  return <ItemDetailView item={item} />;
}

export default async function ItemsPage({ searchParams }: ItemsPageProps) {
  const resolvedSearchParams = await searchParams;
  const openId = parseOpenId(resolvedSearchParams.open);
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
    <>
      <ItemsListView
        items={filteredItems}
        totalCount={allItems.length}
        query={filters.query ?? ""}
        category={filters.category}
        loadError={loadError}
        openId={openId}
      />
      {openId !== undefined ? (
        <DetailPanel closeHref={closeHref("/objets", { q: filters.query, category: filters.category })} resetKey={openId}>
          <Suspense key={openId} fallback={<p>Chargement…</p>}>
            <PanelContent id={openId} />
          </Suspense>
        </DetailPanel>
      ) : null}
    </>
  );
}
