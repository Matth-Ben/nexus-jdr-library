import type { Metadata } from "next";
import { Suspense } from "react";
import { DetailPanel } from "@/components/DetailPanel";
import { LinkListSection, PanelLoader, RefLink } from "@/components/reference/DetailBlocks";
import { ReferenceListView } from "@/components/reference/ReferenceListView";
import styles from "@/components/reference/reference.module.css";
import { CLASS_OPTION_TYPES, isClassOptionType } from "@/lib/class-options/format";
import { getClassOptionById, listClassOptions } from "@/lib/class-options/queries";
import type { ClassOptionDetail, ClassOptionListItem } from "@/lib/class-options/types";
import { closeHref, parseOpenId } from "@/lib/panel";
import { matchesQuery, parseTextQuery, type RawSearchParams } from "@/lib/reference/routes";

const BASE = "/options-de-classe";

export const metadata: Metadata = {
  title: "Options de classe — Nexus JDR Bibliothèque",
  description:
    "Manœuvres, styles de combat, métamagie, faveurs de pacte, disciplines élémentaires, infusions et autres options de classe D&D 5e.",
};

function parseType(raw: RawSearchParams[string]): string | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return isClassOptionType(value) ? value : undefined;
}

function ClassOptionDetailView({ option }: { option: ClassOptionDetail }) {
  return (
    <div className={styles.detail}>
      <h1>{option.name}</h1>
      <dl className={styles.detailGrid}>
        <div>
          <dt>Type</dt>
          <dd>{option.typeLabel}</dd>
        </div>
        <div>
          <dt>Classe</dt>
          <dd>{option.class ? <RefLink kind="class" item={option.class} /> : "—"}</dd>
        </div>
        {option.subclass ? (
          <div>
            <dt>Sous-classe</dt>
            <dd>
              <RefLink kind="subclass" item={option.subclass} />
            </dd>
          </div>
        ) : null}
        {option.minLevel !== null ? (
          <div>
            <dt>Niveau minimum</dt>
            <dd>{option.minLevel}</dd>
          </div>
        ) : null}
        {option.prerequisiteText ? (
          <div>
            <dt>Prérequis</dt>
            <dd>{option.prerequisiteText}</dd>
          </div>
        ) : null}
        {option.cost ? (
          <div>
            <dt>Coût</dt>
            <dd>{option.cost}</dd>
          </div>
        ) : null}
        {option.source ? (
          <div>
            <dt>Source</dt>
            <dd>{option.source}</dd>
          </div>
        ) : null}
      </dl>

      <p className={styles.description}>{option.description}</p>

      {option.grantedBy.length > 0 ? (
        <LinkListSection
          title="Aptitudes qui donnent accès à cette option"
          kind="feature"
          items={option.grantedBy}
          empty=""
        />
      ) : null}
    </div>
  );
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

  let all: ClassOptionListItem[] = [];
  let loadError = false;
  try {
    all = await listClassOptions();
  } catch (error) {
    console.error("[options-de-classe] échec du chargement de la liste", error);
    loadError = true;
  }

  const filtered = all.filter(
    (item) =>
      (type === undefined || item.typeCode === type) &&
      matchesQuery(query, item.name, item.class?.name, item.subclass?.name, item.typeLabel),
  );

  return (
    <>
      <ReferenceListView
        title="Options de classe"
        basePath={BASE}
        intro="Les options parmi lesquelles un personnage choisit : manœuvres du Maître de guerre, styles de combat, tirs arcaniques, runes, métamagie, faveurs de pacte, disciplines élémentaires, infusions d'artificier... Les invocations occultes ont leur propre page."
        entries={filtered.map((item) => ({
          id: item.id,
          name: item.name,
          meta: [
            [item.class?.name, item.subclass?.name].filter(Boolean).join(" — "),
            item.minLevel !== null ? `Niveau ${item.minLevel}` : null,
            item.cost ?? item.prerequisiteText,
          ].filter((value): value is string => Boolean(value)),
          group: item.typeLabel,
        }))}
        totalCount={all.length}
        query={query ?? ""}
        searchPlaceholder="Nom de l'option ou de la classe"
        selects={[
          {
            name: "type",
            label: "Type d'option",
            value: type ?? "",
            allLabel: "Tous les types",
            options: CLASS_OPTION_TYPES.map(({ code, label }) => ({ value: code, label })),
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
              load={getClassOptionById}
              render={(option) => <ClassOptionDetailView option={option} />}
              logTag="options-de-classe"
            />
          </Suspense>
        </DetailPanel>
      ) : null}
    </>
  );
}
