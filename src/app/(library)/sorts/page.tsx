import type { Metadata } from "next";
import { Suspense } from "react";
import { DetailPanel } from "@/components/DetailPanel";
import { closeHref, parseOpenId } from "@/lib/panel";
import { getSpellById, listSpells } from "@/lib/spells/queries";
import { SpellDetailView } from "./SpellDetailView";
import { filterSpells, listSchools, parseSpellFilters, type RawSearchParams } from "@/lib/spells/filters";
import type { SpellListItem } from "@/lib/spells/types";
import { SpellsListView } from "./SpellsListView";

export const metadata: Metadata = {
  title: "Sorts — Nexus JDR Bibliothèque",
  description: "Liste consultable des sorts D&D 5e du référentiel Nexus JDR.",
};

interface SpellsPageProps {
  searchParams: Promise<RawSearchParams>;
}

async function PanelContent({ id }: { id: number }) {
  let spell: Awaited<ReturnType<typeof getSpellById>> = null;
  let loadFailed = false;
  try {
    spell = await getSpellById(id);
  } catch (error) {
    console.error("[sorts] échec du chargement d'une fiche", error);
    loadFailed = true;
  }

  if (loadFailed) {
    return <p role="alert">Impossible de charger cette fiche pour le moment.</p>;
  }
  if (!spell) {
    return <p>Fiche introuvable.</p>;
  }
  return <SpellDetailView spell={spell} />;
}

export default async function SpellsPage({ searchParams }: SpellsPageProps) {
  const resolvedSearchParams = await searchParams;
  const openId = parseOpenId(resolvedSearchParams.open);
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
    <>
      <SpellsListView
        spells={filteredSpells}
        totalCount={allSpells.length}
        schools={schools}
        query={filters.query ?? ""}
        level={filters.level}
        school={filters.school}
        loadError={loadError}
        openId={openId}
      />
      {openId !== undefined ? (
        <DetailPanel closeHref={closeHref("/sorts", { q: filters.query, level: filters.level, school: filters.school })} resetKey={openId}>
          <Suspense key={openId} fallback={<p>Chargement…</p>}>
            <PanelContent id={openId} />
          </Suspense>
        </DetailPanel>
      ) : null}
    </>
  );
}
