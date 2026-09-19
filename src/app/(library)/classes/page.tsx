import type { Metadata } from "next";
import { Suspense } from "react";
import { DetailPanel } from "@/components/DetailPanel";
import { closeHref, parseOpenId } from "@/lib/panel";
import { getClassById, listClasses } from "@/lib/classes/queries";
import { ClassDetailView } from "./ClassDetailView";
import { filterClasses, parseClassFilters, type RawSearchParams } from "@/lib/classes/filters";
import type { ClassListItem } from "@/lib/classes/types";
import { ClassesListView } from "./ClassesListView";

export const metadata: Metadata = {
  title: "Classes — Nexus JDR Bibliothèque",
  description: "Liste consultable des classes D&D 5e du référentiel Nexus JDR.",
};

interface ClassesPageProps {
  searchParams: Promise<RawSearchParams>;
}

async function PanelContent({ id }: { id: number }) {
  let klass: Awaited<ReturnType<typeof getClassById>> = null;
  let loadFailed = false;
  try {
    klass = await getClassById(id);
  } catch (error) {
    console.error("[classes] échec du chargement d'une fiche", error);
    loadFailed = true;
  }

  if (loadFailed) {
    return <p role="alert">Impossible de charger cette fiche pour le moment.</p>;
  }
  if (!klass) {
    return <p>Fiche introuvable.</p>;
  }
  return <ClassDetailView klass={klass} />;
}

export default async function ClassesPage({ searchParams }: ClassesPageProps) {
  const resolvedSearchParams = await searchParams;
  const openId = parseOpenId(resolvedSearchParams.open);
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
    <>
      <ClassesListView
        classes={filteredClasses}
        totalCount={allClasses.length}
        query={filters.query ?? ""}
        loadError={loadError}
        openId={openId}
      />
      {openId !== undefined ? (
        <DetailPanel closeHref={closeHref("/classes", { q: filters.query })} resetKey={openId}>
          <Suspense key={openId} fallback={<p>Chargement…</p>}>
            <PanelContent id={openId} />
          </Suspense>
        </DetailPanel>
      ) : null}
    </>
  );
}
