import type { Metadata } from "next";
import { Suspense } from "react";
import { DetailPanel } from "@/components/DetailPanel";
import {
  LinkListSection,
  PanelLoader,
  RefLink,
  SpellListSection,
} from "@/components/reference/DetailBlocks";
import { ReferenceListView } from "@/components/reference/ReferenceListView";
import styles from "@/components/reference/reference.module.css";
import { closeHref, parseOpenId } from "@/lib/panel";
import { getSubclassById, listSubclasses } from "@/lib/reference/queries";
import {
  matchesQuery,
  parseIdParam,
  parseTextQuery,
  type RawSearchParams,
} from "@/lib/reference/routes";
import type { SubclassDetail, SubclassListItem } from "@/lib/reference/types";

const BASE = "/sous-classes";

export const metadata: Metadata = {
  title: "Sous-classes — Nexus JDR Bibliothèque",
  description: "Sous-classes D&D 5e du référentiel Nexus JDR : aptitudes et sorts accordés.",
};

function SubclassDetailView({ subclass }: { subclass: SubclassDetail }) {
  return (
    <div className={styles.detail}>
      <h1>{subclass.name}</h1>
      <dl className={styles.detailGrid}>
        <div>
          <dt>Classe</dt>
          <dd>
            <RefLink kind="class" item={subclass.class} />
          </dd>
        </div>
        <div>
          <dt>Disponible dès le niveau</dt>
          <dd>{subclass.availableFromLevel}</dd>
        </div>
      </dl>

      <p className={styles.description}>{subclass.description}</p>

      <LinkListSection
        title="Aptitudes de sous-classe"
        kind="feature"
        items={subclass.features}
        empty="Aucune aptitude référencée pour cette sous-classe."
        aside={(feature) => `Niveau ${feature.level}`}
      />

      {subclass.spells.length > 0 ? (
        <SpellListSection
          title="Sorts de sous-classe"
          spells={subclass.spells}
          levelLabel="Niveau de classe"
          empty=""
        />
      ) : null}
    </div>
  );
}

export default async function SubclassesPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;
  const openId = parseOpenId(params.open);
  const query = parseTextQuery(params.q);
  const classId = parseIdParam(params.classe);

  let all: SubclassListItem[] = [];
  let loadError = false;
  try {
    all = await listSubclasses();
  } catch (error) {
    console.error("[sous-classes] échec du chargement de la liste", error);
    loadError = true;
  }

  const classes = [...new Map(all.map((item) => [item.class.id, item.class])).values()].sort(
    (a, b) => a.name.localeCompare(b.name, "fr"),
  );
  const filtered = all
    .filter(
      (item) =>
        (classId === undefined || item.class.id === classId) &&
        matchesQuery(query, item.name, item.class.name),
    )
    .sort(
      (a, b) =>
        a.class.name.localeCompare(b.class.name, "fr") || a.name.localeCompare(b.name, "fr"),
    );

  return (
    <>
      <ReferenceListView
        title="Sous-classes"
        basePath={BASE}
        intro="Spécialisations choisies au fil de la progression d'une classe (voie, collège, domaine, serment, patron...)."
        entries={filtered.map((item) => ({
          id: item.id,
          name: item.name,
          meta: [`Dès le niveau ${item.availableFromLevel}`],
          group: item.class.name,
        }))}
        totalCount={all.length}
        query={query ?? ""}
        searchPlaceholder="Nom de la sous-classe ou de la classe"
        selects={[
          {
            name: "classe",
            label: "Classe",
            value: classId ? String(classId) : "",
            allLabel: "Toutes les classes",
            options: classes.map((klass) => ({ value: String(klass.id), label: klass.name })),
          },
        ]}
        labels={{
          plural: "sous-classes",
          emptyAll: "Aucune sous-classe disponible pour le moment.",
          emptyFiltered: "Aucune sous-classe ne correspond à ces critères.",
          loadError: "Impossible de charger les sous-classes pour le moment. Réessaie plus tard.",
        }}
        loadError={loadError}
        openId={openId}
      />
      {openId !== undefined ? (
        <DetailPanel closeHref={closeHref(BASE, { q: query, classe: classId })} resetKey={openId}>
          <Suspense key={openId} fallback={<p>Chargement…</p>}>
            <PanelLoader
              id={openId}
              load={getSubclassById}
              render={(subclass) => <SubclassDetailView subclass={subclass} />}
              logTag="sous-classes"
            />
          </Suspense>
        </DetailPanel>
      ) : null}
    </>
  );
}
