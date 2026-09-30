import Link from "next/link";
import { isClassOptionType } from "@/lib/class-options/format";
import { REFERENCE_PATHS } from "@/lib/reference/routes";
import type { FeatureDetail } from "@/lib/reference/types";
import { LinkListSection, RefLink } from "./DetailBlocks";
import styles from "./reference.module.css";

/** Fiche d'une aptitude de classe (`/aptitudes`). */
export function FeatureDetailView({ feature }: { feature: FeatureDetail }) {
  return (
    <div className={styles.detail}>
      <h1>{feature.name}</h1>
      <dl className={styles.detailGrid}>
        <div>
          <dt>Classe</dt>
          <dd>{feature.class ? <RefLink kind="class" item={feature.class} /> : "—"}</dd>
        </div>
        {feature.subclass ? (
          <div>
            <dt>Sous-classe</dt>
            <dd>
              <RefLink kind="subclass" item={feature.subclass} />
            </dd>
          </div>
        ) : null}
        <div>
          <dt>Niveau</dt>
          <dd>{feature.level}</dd>
        </div>
        {feature.choiceCode && feature.choiceLabel ? (
          <div>
            <dt>Choix</dt>
            <dd>
              {isClassOptionType(feature.choiceCode) ? (
                <Link
                  href={`${REFERENCE_PATHS.option}?type=${encodeURIComponent(feature.choiceCode)}`}
                  className={styles.refLink}
                >
                  {feature.choiceLabel}
                </Link>
              ) : feature.choiceCode === "invocation" ? (
                <Link href={REFERENCE_PATHS.invocation} className={styles.refLink}>
                  {feature.choiceLabel}
                </Link>
              ) : (
                feature.choiceLabel
              )}
            </dd>
          </div>
        ) : null}
        {feature.usesPerRestLabel ? (
          <div>
            <dt>Utilisations</dt>
            <dd>{feature.usesPerRestLabel}</dd>
          </div>
        ) : null}
      </dl>

      <p className={styles.description}>{feature.description}</p>

      {feature.choiceCode === "sous_classe" && feature.class ? (
        <p>
          <Link
            href={`${REFERENCE_PATHS.subclass}?classe=${feature.class.id}`}
            className={styles.refLink}
          >
            Voir les sous-classes de {feature.class.name}
          </Link>
        </p>
      ) : null}

      {feature.classOptions.length > 0 ? (
        <LinkListSection
          title="Options disponibles"
          kind="option"
          items={feature.classOptions}
          empty=""
        />
      ) : null}

      {feature.invocations.length > 0 ? (
        <LinkListSection
          title={
            feature.choiceCode === "pacte"
              ? "Invocations liées à un pacte"
              : "Invocations disponibles"
          }
          kind="invocation"
          items={feature.invocations}
          empty=""
          footer={
            <Link href={REFERENCE_PATHS.invocation} className={styles.refLink}>
              Voir toutes les invocations
            </Link>
          }
        />
      ) : null}
    </div>
  );
}
