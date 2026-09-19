import type { Metadata } from "next";
import { Suspense } from "react";
import { DetailPanel } from "@/components/DetailPanel";
import { closeHref, parseOpenId } from "@/lib/panel";
import { getFeatById, listFeats } from "@/lib/feats/queries";
import { FeatDetailView } from "./FeatDetailView";
import { filterFeats, parseFeatFilters, type RawSearchParams } from "@/lib/feats/filters";
import type { FeatListItem } from "@/lib/feats/types";
import { FeatsListView } from "./FeatsListView";

export const metadata: Metadata = {
  title: "Dons — Nexus JDR Bibliothèque",
  description: "Liste consultable des dons D&D 5e du référentiel Nexus JDR.",
};

interface FeatsPageProps {
  searchParams: Promise<RawSearchParams>;
}

async function PanelContent({ id }: { id: number }) {
  let feat: Awaited<ReturnType<typeof getFeatById>> = null;
  let loadFailed = false;
  try {
    feat = await getFeatById(id);
  } catch (error) {
    console.error("[dons] échec du chargement d'une fiche", error);
    loadFailed = true;
  }

  if (loadFailed) {
    return <p role="alert">Impossible de charger cette fiche pour le moment.</p>;
  }
  if (!feat) {
    return <p>Fiche introuvable.</p>;
  }
  return <FeatDetailView feat={feat} />;
}

export default async function FeatsPage({ searchParams }: FeatsPageProps) {
  const resolvedSearchParams = await searchParams;
  const openId = parseOpenId(resolvedSearchParams.open);
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
    <>
      <FeatsListView
        feats={filteredFeats}
        totalCount={allFeats.length}
        query={filters.query ?? ""}
        loadError={loadError}
        openId={openId}
      />
      {openId !== undefined ? (
        <DetailPanel closeHref={closeHref("/dons", { q: filters.query })} resetKey={openId}>
          <Suspense key={openId} fallback={<p>Chargement…</p>}>
            <PanelContent id={openId} />
          </Suspense>
        </DetailPanel>
      ) : null}
    </>
  );
}
