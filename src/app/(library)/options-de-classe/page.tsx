import type { Metadata } from "next";
import { Suspense } from "react";
import { DetailPanel } from "@/components/DetailPanel";
import { PanelLoader } from "@/components/reference/DetailBlocks";
import { FeatureDetailView } from "@/components/reference/FeatureDetailView";
import { ReferenceListView } from "@/components/reference/ReferenceListView";
import { formatChoiceType } from "@/lib/classes/translations";
import { closeHref, parseOpenId } from "@/lib/panel";
import { OPTION_CHOICE_TYPES, isOptionChoiceType } from "@/lib/reference/format";
import { getFeatureById, listFeatures } from "@/lib/reference/queries";
import { matchesQuery, parseTextQuery, type RawSearchParams } from "@/lib/reference/routes";
import type { FeatureListItem } from "@/lib/reference/types";

const BASE = "/options-de-classe";

export const metadata: Metadata = {
  title: "Options de classe — Nexus JDR Bibliothèque",
  description:
    "Faveurs de pacte, métamagie, styles de combat, manœuvres et autres choix de classe D&D 5e.",
};

function parseType(raw: RawSearchParams[string]): string | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && isOptionChoiceType(value) ? value : undefined;
}

export default async function ClassOptionsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;
  const openId = parseOpenId(params.open);
  const query = parseTextQuery(params.q);
  const type = parseType(params.type);

  let all: FeatureListItem[] = [];
  let loadError = false;
  try {
    all = (await listFeatures()).filter((item) => isOptionChoiceType(item.choiceCode));
  } catch (error) {
    console.error("[options-de-classe] échec du chargement de la liste", error);
    loadError = true;
  }

  const order = OPTION_CHOICE_TYPES as readonly string[];
  const filtered = all
    .filter(
      (item) =>
        (type === undefined || item.choiceCode === type) &&
        matchesQuery(query, item.name, item.class?.name, item.subclass?.name, item.choiceLabel),
    )
    .sort(
      (a, b) =>
        order.indexOf(a.choiceCode ?? "") - order.indexOf(b.choiceCode ?? "") ||
        (a.class?.name ?? "").localeCompare(b.class?.name ?? "", "fr") ||
        a.level - b.level,
    );

  return (
    <>
      <ReferenceListView
        title="Options de classe"
        basePath={BASE}
        intro="Aptitudes où le joueur choisit parmi plusieurs options : faveur de pacte, invocations, métamagie, style de combat, manœuvres..."
        entries={filtered.map((item) => ({
          id: item.id,
          name: item.name,
          meta: [
            [item.class?.name, item.subclass?.name].filter(Boolean).join(" — "),
            `Niveau ${item.level}`,
          ],
          group: item.choiceLabel ?? undefined,
        }))}
        totalCount={all.length}
        query={query ?? ""}
        searchPlaceholder="Nom de l'option ou de la classe"
        selects={[
          {
            name: "type",
            label: "Type de choix",
            value: type ?? "",
            allLabel: "Tous les types",
            options: OPTION_CHOICE_TYPES.map((code) => ({
              value: code,
              label: formatChoiceType(code),
            })),
          },
        ]}
        labels={{
          plural: "options",
          emptyAll: "Aucune option de classe disponible pour le moment.",
          emptyFiltered: "Aucune option de classe ne correspond à ces critères.",
          loadError: "Impossible de charger les options de classe pour le moment. Réessaie plus tard.",
        }}
        loadError={loadError}
        openId={openId}
      />
      {openId !== undefined ? (
        <DetailPanel closeHref={closeHref(BASE, { q: query, type })} resetKey={openId}>
          <Suspense key={openId} fallback={<p>Chargement…</p>}>
            <PanelLoader
              id={openId}
              load={getFeatureById}
              render={(feature) => <FeatureDetailView feature={feature} />}
              logTag="options-de-classe"
            />
          </Suspense>
        </DetailPanel>
      ) : null}
    </>
  );
}
