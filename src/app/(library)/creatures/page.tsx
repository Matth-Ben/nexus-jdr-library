import type { Metadata } from "next";
import { Suspense } from "react";
import { DetailPanel } from "@/components/DetailPanel";
import { PanelLoader } from "@/components/reference/DetailBlocks";
import { ReferenceListView } from "@/components/reference/ReferenceListView";
import { formatChallenge } from "@/lib/creatures/format";
import { getCreatureById, listCreatures } from "@/lib/creatures/queries";
import type { CreatureListItem } from "@/lib/creatures/types";
import { closeHref, parseOpenId } from "@/lib/panel";
import { matchesQuery, parseTextQuery, type RawSearchParams } from "@/lib/reference/routes";
import { CreatureDetailView } from "./CreatureDetailView";

const BASE = "/creatures";

export const metadata: Metadata = {
  title: "Créatures — Nexus JDR Bibliothèque",
  description: "Bestiaire D&D 5e (SRD 5.2) du référentiel Nexus JDR : monstres, animaux et PNJ.",
};

function firstValue(raw: RawSearchParams[string]): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

export default async function CreaturesPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;
  const openId = parseOpenId(params.open);
  const query = parseTextQuery(params.q);

  let all: CreatureListItem[] = [];
  let loadError = false;
  try {
    all = await listCreatures();
  } catch (error) {
    console.error("[creatures] échec du chargement de la liste", error);
    loadError = true;
  }

  const types = [...new Set(all.map((item) => item.type))].sort((a, b) => a.localeCompare(b, "fr"));
  const challenges = [...new Set(all.map((item) => item.challenge))].sort((a, b) => a - b);

  const rawType = firstValue(params.type);
  const type = rawType && types.includes(rawType) ? rawType : undefined;
  const rawChallenge = firstValue(params.fp);
  const challenge =
    rawChallenge !== undefined && rawChallenge !== "" && challenges.includes(Number(rawChallenge))
      ? Number(rawChallenge)
      : undefined;

  const filtered = all.filter(
    (item) =>
      (type === undefined || item.type === type) &&
      (challenge === undefined || item.challenge === challenge) &&
      matchesQuery(query, item.name),
  );

  return (
    <>
      <ReferenceListView
        title="Créatures"
        basePath={BASE}
        intro="Monstres, animaux et personnages non joueurs du SRD 5.2 (Manuel des Monstres 2024), avec leur bloc de statistiques complet."
        entries={filtered.map((item) => ({
          id: item.id,
          name: item.name,
          meta: [`${item.type} · ${item.size}`, `FP ${formatChallenge(item.challenge)}`],
        }))}
        totalCount={all.length}
        query={query ?? ""}
        searchPlaceholder="Nom de la créature"
        selects={[
          {
            name: "type",
            label: "Type",
            value: type ?? "",
            allLabel: "Tous les types",
            options: types.map((value) => ({ value, label: value })),
          },
          {
            name: "fp",
            label: "Facteur de puissance",
            value: challenge === undefined ? "" : String(challenge),
            allLabel: "Tous les FP",
            options: challenges.map((value) => ({
              value: String(value),
              label: `FP ${formatChallenge(value)}`,
            })),
          },
        ]}
        labels={{
          plural: "créatures",
          emptyAll: "Aucune créature disponible pour le moment.",
          emptyFiltered: "Aucune créature ne correspond à ces critères.",
          loadError: "Impossible de charger les créatures pour le moment. Réessaie plus tard.",
        }}
        loadError={loadError}
        openId={openId}
      />
      {openId !== undefined ? (
        <DetailPanel
          closeHref={closeHref(BASE, { q: query, type, fp: challenge })}
          resetKey={openId}
        >
          <Suspense key={openId} fallback={<p>Chargement…</p>}>
            <PanelLoader
              id={openId}
              load={getCreatureById}
              render={(creature) => <CreatureDetailView creature={creature} />}
              logTag="creatures"
            />
          </Suspense>
        </DetailPanel>
      ) : null}
    </>
  );
}
