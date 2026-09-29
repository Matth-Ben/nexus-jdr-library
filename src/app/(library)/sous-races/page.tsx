import type { Metadata } from "next";
import { Suspense } from "react";
import { DetailPanel } from "@/components/DetailPanel";
import {
  LinkListSection,
  PanelLoader,
  RefLink,
  SpellListSection,
  TraitList,
} from "@/components/reference/DetailBlocks";
import { ReferenceListView } from "@/components/reference/ReferenceListView";
import styles from "@/components/reference/reference.module.css";
import { closeHref, parseOpenId } from "@/lib/panel";
import { getSubraceById, listSubraces } from "@/lib/reference/queries";
import {
  matchesQuery,
  parseIdParam,
  parseTextQuery,
  type RawSearchParams,
} from "@/lib/reference/routes";
import type { SubraceDetail, SubraceListItem } from "@/lib/reference/types";

const BASE = "/sous-races";

export const metadata: Metadata = {
  title: "Sous-races — Nexus JDR Bibliothèque",
  description: "Sous-races D&D 5e du référentiel Nexus JDR, avec leur race parente.",
};

function SubraceDetailView({ subrace }: { subrace: SubraceDetail }) {
  return (
    <div className={styles.detail}>
      <h1>{subrace.name}</h1>
      <dl className={styles.detailGrid}>
        <div>
          <dt>Race</dt>
          <dd>
            <RefLink kind="race" item={subrace.race} />
          </dd>
        </div>
        <div>
          <dt>Bonus de caractéristiques</dt>
          <dd>{subrace.abilityBonuses}</dd>
        </div>
      </dl>

      <section className={styles.section}>
        <h2>Traits</h2>
        {subrace.traits.length > 0 ? (
          <TraitList traits={subrace.traits} />
        ) : (
          <p className={styles.empty}>Aucun trait propre à cette sous-race.</p>
        )}
      </section>

      {subrace.lineages.length > 0 ? (
        <LinkListSection title="Lignées" kind="lineage" items={subrace.lineages} empty="" />
      ) : null}

      {subrace.innateSpells.length > 0 ? (
        <SpellListSection
          title="Sorts innés"
          spells={subrace.innateSpells}
          levelLabel="Niveau de personnage"
          empty=""
        />
      ) : null}
    </div>
  );
}

export default async function SubracesPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;
  const openId = parseOpenId(params.open);
  const query = parseTextQuery(params.q);
  const raceId = parseIdParam(params.race);

  let all: SubraceListItem[] = [];
  let loadError = false;
  try {
    all = await listSubraces();
  } catch (error) {
    console.error("[sous-races] échec du chargement de la liste", error);
    loadError = true;
  }

  const races = [...new Map(all.map((item) => [item.race.id, item.race])).values()].sort((a, b) =>
    a.name.localeCompare(b.name, "fr"),
  );
  const filtered = all.filter(
    (item) =>
      (raceId === undefined || item.race.id === raceId) &&
      matchesQuery(query, item.name, item.race.name),
  );

  return (
    <>
      <ReferenceListView
        title="Sous-races"
        basePath={BASE}
        intro="Variantes d'une race : chacune ajoute ses propres bonus et traits à ceux de sa race parente."
        entries={filtered.map((item) => ({
          id: item.id,
          name: item.name,
          meta: [item.race.name, item.abilityBonuses],
        }))}
        totalCount={all.length}
        query={query ?? ""}
        searchPlaceholder="Nom de la sous-race ou de la race"
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
          plural: "sous-races",
          emptyAll: "Aucune sous-race disponible pour le moment.",
          emptyFiltered: "Aucune sous-race ne correspond à ces critères.",
          loadError: "Impossible de charger les sous-races pour le moment. Réessaie plus tard.",
        }}
        loadError={loadError}
        openId={openId}
      />
      {openId !== undefined ? (
        <DetailPanel closeHref={closeHref(BASE, { q: query, race: raceId })} resetKey={openId}>
          <Suspense key={openId} fallback={<p>Chargement…</p>}>
            <PanelLoader
              id={openId}
              load={getSubraceById}
              render={(subrace) => <SubraceDetailView subrace={subrace} />}
              logTag="sous-races"
            />
          </Suspense>
        </DetailPanel>
      ) : null}
    </>
  );
}
