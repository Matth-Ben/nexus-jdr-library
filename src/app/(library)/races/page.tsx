import type { Metadata } from "next";
import { Suspense } from "react";
import { DetailPanel } from "@/components/DetailPanel";
import { closeHref, parseOpenId } from "@/lib/panel";
import { getRaceById, listRaces } from "@/lib/races/queries";
import { RaceDetailView } from "./RaceDetailView";
import { filterRaces, parseRaceFilters, type RawSearchParams } from "@/lib/races/filters";
import type { RaceListItem } from "@/lib/races/types";
import { RacesListView } from "./RacesListView";

export const metadata: Metadata = {
  title: "Races — Nexus JDR Bibliothèque",
  description: "Liste consultable des races D&D 5e du référentiel Nexus JDR.",
};

interface RacesPageProps {
  searchParams: Promise<RawSearchParams>;
}

async function PanelContent({ id }: { id: number }) {
  let race: Awaited<ReturnType<typeof getRaceById>> = null;
  let loadFailed = false;
  try {
    race = await getRaceById(id);
  } catch (error) {
    console.error("[races] échec du chargement d'une fiche", error);
    loadFailed = true;
  }

  if (loadFailed) {
    return <p role="alert">Impossible de charger cette fiche pour le moment.</p>;
  }
  if (!race) {
    return <p>Fiche introuvable.</p>;
  }
  return <RaceDetailView race={race} />;
}

export default async function RacesPage({ searchParams }: RacesPageProps) {
  const resolvedSearchParams = await searchParams;
  const openId = parseOpenId(resolvedSearchParams.open);
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
    <>
      <RacesListView
        races={filteredRaces}
        totalCount={allRaces.length}
        query={filters.query ?? ""}
        loadError={loadError}
        openId={openId}
      />
      {openId !== undefined ? (
        <DetailPanel closeHref={closeHref("/races", { q: filters.query })} resetKey={openId}>
          <Suspense key={openId} fallback={<p>Chargement…</p>}>
            <PanelContent id={openId} />
          </Suspense>
        </DetailPanel>
      ) : null}
    </>
  );
}
