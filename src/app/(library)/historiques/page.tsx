import type { Metadata } from "next";
import { Suspense } from "react";
import { DetailPanel } from "@/components/DetailPanel";
import { PanelLoader } from "@/components/reference/DetailBlocks";
import { ReferenceListView } from "@/components/reference/ReferenceListView";
import styles from "@/components/reference/reference.module.css";
import { getBackgroundById, listBackgrounds } from "@/lib/backgrounds/queries";
import type { BackgroundDetail, BackgroundListItem } from "@/lib/backgrounds/types";
import { closeHref, parseOpenId } from "@/lib/panel";
import { matchesQuery, parseTextQuery, type RawSearchParams } from "@/lib/reference/routes";

const BASE = "/historiques";

export const metadata: Metadata = {
  title: "Historiques — Nexus JDR Bibliothèque",
  description:
    "Historiques de personnage D&D 5e du référentiel Nexus JDR : compétences, outils, langues, équipement et aptitude.",
};

function Stat({ label, value }: { label: string; value: string | null }) {
  if (!value) {
    return null;
  }
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function BackgroundDetailView({ background }: { background: BackgroundDetail }) {
  return (
    <div className={styles.detail}>
      <h1>{background.name}</h1>
      {background.description ? (
        <p className={styles.description}>{background.description}</p>
      ) : null}

      <dl className={styles.detailGrid}>
        <Stat label="Compétences" value={background.skills.join(", ") || null} />
        <Stat label="Outils" value={background.tools.join(", ") || null} />
        <Stat label="Langues" value={background.languages} />
        <Stat label="Véhicules" value={background.vehicles.join(", ") || null} />
      </dl>

      {background.equipment.length > 0 ? (
        <section className={styles.section}>
          <h2>Équipement</h2>
          <ul className={styles.linkList}>
            {background.equipment.map((item, index) => (
              <li key={`${item}-${index}`} className={styles.linkItem}>
                {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {background.featureName ? (
        <section className={styles.section}>
          <h2>Aptitude</h2>
          <dl className={styles.traitList}>
            <div className={styles.trait}>
              <dt>{background.featureName}</dt>
              <dd>{background.featureDescription ?? ""}</dd>
            </div>
          </dl>
        </section>
      ) : null}

      {background.incomplete ? (
        <p className={styles.summary}>Fiche incomplète : certaines informations restent à saisir.</p>
      ) : null}
    </div>
  );
}

function firstValue(raw: RawSearchParams[string]): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

export default async function BackgroundsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;
  const openId = parseOpenId(params.open);
  const query = parseTextQuery(params.q);

  let all: BackgroundListItem[] = [];
  let loadError = false;
  try {
    all = await listBackgrounds();
  } catch (error) {
    console.error("[historiques] échec du chargement de la liste", error);
    loadError = true;
  }

  const skills = [...new Set(all.flatMap((item) => item.skills))].sort((a, b) =>
    a.localeCompare(b, "fr"),
  );
  const rawSkill = firstValue(params.competence);
  const skill = rawSkill && skills.includes(rawSkill) ? rawSkill : undefined;

  const filtered = all.filter(
    (item) =>
      (skill === undefined || item.skills.includes(skill)) &&
      matchesQuery(query, item.name, ...item.skills),
  );

  return (
    <>
      <ReferenceListView
        title="Historiques"
        basePath={BASE}
        intro="Le passé du personnage avant l'aventure : maîtrises de compétences et d'outils, langues, équipement de départ et aptitude d'historique."
        entries={filtered.map((item) => ({
          id: item.id,
          name: item.name,
          meta: item.skills.length > 0 ? [item.skills.join(", ")] : [],
        }))}
        totalCount={all.length}
        query={query ?? ""}
        searchPlaceholder="Nom de l'historique ou compétence"
        selects={[
          {
            name: "competence",
            label: "Compétence",
            value: skill ?? "",
            allLabel: "Toutes les compétences",
            options: skills.map((value) => ({ value, label: value })),
          },
        ]}
        labels={{
          plural: "historiques",
          emptyAll: "Aucun historique disponible pour le moment.",
          emptyFiltered: "Aucun historique ne correspond à ces critères.",
          loadError: "Impossible de charger les historiques pour le moment. Réessaie plus tard.",
        }}
        loadError={loadError}
        openId={openId}
      />
      {openId !== undefined ? (
        <DetailPanel closeHref={closeHref(BASE, { q: query, competence: skill })} resetKey={openId}>
          <Suspense key={openId} fallback={<p>Chargement…</p>}>
            <PanelLoader
              id={openId}
              load={getBackgroundById}
              render={(background) => <BackgroundDetailView background={background} />}
              logTag="historiques"
            />
          </Suspense>
        </DetailPanel>
      ) : null}
    </>
  );
}
