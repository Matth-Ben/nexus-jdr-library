import type { Metadata } from "next";
import { Suspense } from "react";
import { DetailPanel } from "@/components/DetailPanel";
import { PanelLoader, RefLink, SpellListSection } from "@/components/reference/DetailBlocks";
import { ReferenceListView } from "@/components/reference/ReferenceListView";
import styles from "@/components/reference/reference.module.css";
import { closeHref, parseOpenId } from "@/lib/panel";
import { getLineageById, listLineages } from "@/lib/reference/queries";
import {
  matchesQuery,
  parseIdParam,
  parseTextQuery,
  type RawSearchParams,
} from "@/lib/reference/routes";
import type { LineageDetail, LineageListItem } from "@/lib/reference/types";

const BASE = "/lignees";

export const metadata: Metadata = {
  title: "Lignées — Nexus JDR Bibliothèque",
  description: "Lignées et ascendances raciales D&D 5e du référentiel Nexus JDR.",
};

function LineageDetailView({ lineage }: { lineage: LineageDetail }) {
  return (
    <div className={styles.detail}>
      <h1>{lineage.name}</h1>
      <dl className={styles.detailGrid}>
        {lineage.race ? (
          <div>
            <dt>Race</dt>
            <dd>
              <RefLink kind="race" item={lineage.race} />
            </dd>
          </div>
        ) : null}
        {lineage.subrace ? (
          <div>
            <dt>Sous-race</dt>
            <dd>
              <RefLink kind="subrace" item={lineage.subrace} />
            </dd>
          </div>
        ) : null}
        {lineage.groupLabel ? (
          <div>
            <dt>Type</dt>
            <dd>{lineage.groupLabel}</dd>
          </div>
        ) : null}
        {lineage.damageType ? (
          <div>
            <dt>Type de dégâts</dt>
            <dd>{lineage.damageType}</dd>
          </div>
        ) : null}
        {lineage.resistance ? (
          <div>
            <dt>Résistance</dt>
            <dd>{lineage.resistance}</dd>
          </div>
        ) : null}
        {lineage.abilityBonuses ? (
          <div>
            <dt>Bonus de caractéristiques</dt>
            <dd>{lineage.abilityBonuses}</dd>
          </div>
        ) : null}
        {lineage.source ? (
          <div>
            <dt>Source</dt>
            <dd>{lineage.source}</dd>
          </div>
        ) : null}
      </dl>

      {lineage.effect ? <p className={styles.description}>{lineage.effect}</p> : null}

      {lineage.innateSpells.length > 0 ? (
        <SpellListSection
          title="Sorts innés"
          spells={lineage.innateSpells}
          levelLabel="Niveau de personnage"
          empty=""
        />
      ) : null}
    </div>
  );
}

export default async function LineagesPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;
  const openId = parseOpenId(params.open);
  const query = parseTextQuery(params.q);
  const raceId = parseIdParam(params.race);

  let all: LineageListItem[] = [];
  let loadError = false;
  try {
    all = await listLineages();
  } catch (error) {
    console.error("[lignees] échec du chargement de la liste", error);
    loadError = true;
  }

  const races = [
    ...new Map(
      all.flatMap((item) => (item.race ? [[item.race.id, item.race] as const] : [])),
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name, "fr"));

  const filtered = all
    .filter(
      (item) =>
        (raceId === undefined || item.race?.id === raceId) &&
        matchesQuery(query, item.name, item.race?.name, item.subrace?.name, item.groupLabel),
    )
    .sort(
      (a, b) =>
        (a.race?.name ?? "").localeCompare(b.race?.name ?? "", "fr") ||
        a.name.localeCompare(b.name, "fr"),
    );

  return (
    <>
      <ReferenceListView
        title="Lignées"
        basePath={BASE}
        intro="Ascendances et lignées qui précisent une race : ascendance draconique, lignées elfiques, héritages élémentaires..."
        entries={filtered.map((item) => ({
          id: item.id,
          name: item.name,
          meta: [item.subrace?.name, item.groupLabel, item.source].filter(
            (value): value is string => Boolean(value),
          ),
          group: item.race?.name,
        }))}
        totalCount={all.length}
        query={query ?? ""}
        searchPlaceholder="Nom de la lignée ou de la race"
        selects={[
          {
            name: "race",
            label: "Race",
            value: raceId ? String(raceId) : "",
            allLabel: "Toutes les races",
            options: races.map((race) => ({ value: String(race.id), label: race.name })),
          },
        ]}
        labels={{
          plural: "lignées",
          emptyAll: "Aucune lignée disponible pour le moment.",
          emptyFiltered: "Aucune lignée ne correspond à ces critères.",
          loadError: "Impossible de charger les lignées pour le moment. Réessaie plus tard.",
        }}
        loadError={loadError}
        openId={openId}
      />
      {openId !== undefined ? (
        <DetailPanel closeHref={closeHref(BASE, { q: query, race: raceId })} resetKey={openId}>
          <Suspense key={openId} fallback={<p>Chargement…</p>}>
            <PanelLoader
              id={openId}
              load={getLineageById}
              render={(lineage) => <LineageDetailView lineage={lineage} />}
              logTag="lignees"
            />
          </Suspense>
        </DetailPanel>
      ) : null}
    </>
  );
}
