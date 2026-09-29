import type { Metadata } from "next";
import { Suspense } from "react";
import { DetailPanel } from "@/components/DetailPanel";
import { PanelLoader } from "@/components/reference/DetailBlocks";
import { FeatureDetailView } from "@/components/reference/FeatureDetailView";
import { ReferenceListView } from "@/components/reference/ReferenceListView";
import { closeHref, parseOpenId } from "@/lib/panel";
import { getFeatureById, listFeatures } from "@/lib/reference/queries";
import {
  matchesQuery,
  parseIdParam,
  parseTextQuery,
  type RawSearchParams,
} from "@/lib/reference/routes";
import type { FeatureListItem } from "@/lib/reference/types";

const BASE = "/aptitudes";

export const metadata: Metadata = {
  title: "Aptitudes de classe — Nexus JDR Bibliothèque",
  description: "Aptitudes des classes et sous-classes D&D 5e du référentiel Nexus JDR.",
};

type Scope = "classe" | "sous-classe";

function parseScope(raw: RawSearchParams[string]): Scope | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === "classe" || value === "sous-classe" ? value : undefined;
}

function groupTitle(feature: FeatureListItem): string {
  const className = feature.class?.name ?? "Classe inconnue";
  return feature.subclass ? `${className} — ${feature.subclass.name}` : className;
}

export default async function FeaturesPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;
  const openId = parseOpenId(params.open);
  const query = parseTextQuery(params.q);
  const classId = parseIdParam(params.classe);
  const scope = parseScope(params.portee);

  let all: FeatureListItem[] = [];
  let loadError = false;
  try {
    all = await listFeatures();
  } catch (error) {
    console.error("[aptitudes] échec du chargement de la liste", error);
    loadError = true;
  }

  const classes = [
    ...new Map(
      all.flatMap((item) => (item.class ? [[item.class.id, item.class] as const] : [])),
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name, "fr"));

  const filtered = all.filter(
    (item) =>
      (classId === undefined || item.class?.id === classId) &&
      (scope === undefined || (scope === "sous-classe") === (item.subclass !== null)) &&
      matchesQuery(query, item.name, item.subclass?.name),
  );

  return (
    <>
      <ReferenceListView
        title="Aptitudes de classe"
        basePath={BASE}
        intro="Capacités gagnées niveau après niveau, par classe puis par sous-classe."
        entries={filtered.map((item) => ({
          id: item.id,
          name: item.name,
          meta: [`Niveau ${item.level}`, ...(item.choiceLabel ? [item.choiceLabel] : [])],
          group: groupTitle(item),
        }))}
        totalCount={all.length}
        query={query ?? ""}
        searchPlaceholder="Nom de l'aptitude ou de la sous-classe"
        selects={[
          {
            name: "classe",
            label: "Classe",
            value: classId ? String(classId) : "",
            allLabel: "Toutes les classes",
            options: classes.map((klass) => ({ value: String(klass.id), label: klass.name })),
          },
          {
            name: "portee",
            label: "Portée",
            value: scope ?? "",
            allLabel: "Classes et sous-classes",
            options: [
              { value: "classe", label: "Classe uniquement" },
              { value: "sous-classe", label: "Sous-classes uniquement" },
            ],
          },
        ]}
        labels={{
          plural: "aptitudes",
          emptyAll: "Aucune aptitude disponible pour le moment.",
          emptyFiltered: "Aucune aptitude ne correspond à ces critères.",
          loadError: "Impossible de charger les aptitudes pour le moment. Réessaie plus tard.",
        }}
        loadError={loadError}
        openId={openId}
      />
      {openId !== undefined ? (
        <DetailPanel
          closeHref={closeHref(BASE, { q: query, classe: classId, portee: scope })}
          resetKey={openId}
        >
          <Suspense key={openId} fallback={<p>Chargement…</p>}>
            <PanelLoader
              id={openId}
              load={getFeatureById}
              render={(feature) => <FeatureDetailView feature={feature} />}
              logTag="aptitudes"
            />
          </Suspense>
        </DetailPanel>
      ) : null}
    </>
  );
}
