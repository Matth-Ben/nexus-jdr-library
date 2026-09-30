import type { Metadata } from "next";
import { Suspense } from "react";
import { DetailPanel } from "@/components/DetailPanel";
import { PanelLoader, RefLink } from "@/components/reference/DetailBlocks";
import { ReferenceListView } from "@/components/reference/ReferenceListView";
import styles from "@/components/reference/reference.module.css";
import { closeHref, parseOpenId } from "@/lib/panel";
import {
  getInvocationById,
  listInvocations,
  type InvocationListEntry,
} from "@/lib/reference/queries";
import { matchesQuery, parseTextQuery, type RawSearchParams } from "@/lib/reference/routes";
import type { InvocationDetail } from "@/lib/reference/types";

const BASE = "/invocations";

export const metadata: Metadata = {
  title: "Invocations occultes — Nexus JDR Bibliothèque",
  description: "Invocations occultes D&D 5e du référentiel Nexus JDR, avec leurs prérequis.",
};

function InvocationDetailView({ invocation }: { invocation: InvocationDetail }) {
  return (
    <div className={styles.detail}>
      <h1>{invocation.name}</h1>
      <dl className={styles.detailGrid}>
        <div>
          <dt>Prérequis</dt>
          <dd>{invocation.prerequisiteText ?? "Aucun"}</dd>
        </div>
        {invocation.grantedBy.length > 0 ? (
          <div>
            <dt>Accessible via</dt>
            <dd>
              {invocation.grantedBy.map(({ feature, class: klass }, index) => (
                <span key={feature.id}>
                  {index > 0 ? ", " : null}
                  <RefLink kind="feature" item={feature} />
                  {klass ? (
                    <>
                      {" ("}
                      <RefLink kind="class" item={klass} />
                      {")"}
                    </>
                  ) : null}
                </span>
              ))}
            </dd>
          </div>
        ) : null}
        {invocation.pactLabel ? (
          <div>
            <dt>Pacte requis</dt>
            <dd>
              {invocation.pactFeature ? (
                <RefLink
                  kind="feature"
                  item={{ id: invocation.pactFeature.id, name: invocation.pactLabel }}
                />
              ) : (
                invocation.pactLabel
              )}
            </dd>
          </div>
        ) : null}
        {invocation.cantrip ? (
          <div>
            <dt>Sort mineur requis</dt>
            <dd>
              <RefLink kind="spell" item={invocation.cantrip} />
            </dd>
          </div>
        ) : null}
      </dl>

      <p className={styles.description}>{invocation.description}</p>
    </div>
  );
}

export default async function InvocationsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;
  const openId = parseOpenId(params.open);
  const query = parseTextQuery(params.q);

  let all: InvocationListEntry[] = [];
  let loadError = false;
  try {
    all = await listInvocations();
  } catch (error) {
    console.error("[invocations] échec du chargement de la liste", error);
    loadError = true;
  }

  const filtered = all
    .filter((item) => matchesQuery(query, item.name, item.prerequisiteText))
    .sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || a.name.localeCompare(b.name, "fr"));

  return (
    <>
      <ReferenceListView
        title="Invocations occultes"
        basePath={BASE}
        intro="Bribes de savoir interdit que l'occultiste apprend grâce à son pacte, classées par niveau requis."
        entries={filtered.map((item) => ({
          id: item.id,
          name: item.name,
          meta: item.prerequisiteText ? [item.prerequisiteText] : ["Sans prérequis"],
          group: item.level ? `Niveau ${item.level} et plus` : "Dès le niveau 1",
        }))}
        totalCount={all.length}
        query={query ?? ""}
        searchPlaceholder="Nom ou prérequis"
        labels={{
          plural: "invocations",
          emptyAll: "Aucune invocation disponible pour le moment.",
          emptyFiltered: "Aucune invocation ne correspond à ces critères.",
          loadError: "Impossible de charger les invocations pour le moment. Réessaie plus tard.",
        }}
        loadError={loadError}
        openId={openId}
      />
      {openId !== undefined ? (
        <DetailPanel closeHref={closeHref(BASE, { q: query })} resetKey={openId}>
          <Suspense key={openId} fallback={<p>Chargement…</p>}>
            <PanelLoader
              id={openId}
              load={getInvocationById}
              render={(invocation) => <InvocationDetailView invocation={invocation} />}
              logTag="invocations"
            />
          </Suspense>
        </DetailPanel>
      ) : null}
    </>
  );
}
