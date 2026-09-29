import Link from "next/link";
import { RefLink } from "@/components/reference/DetailBlocks";
import { formatStringList } from "@/lib/classes/translations";
import { REFERENCE_PATHS } from "@/lib/reference/routes";
import type { ClassDetail } from "@/lib/classes/types";
import { hitDieLabel } from "./ClassesListView";
import { ProposeModificationLink } from "@/components/ProposeModificationLink";
import styles from "./classes.module.css";

export interface ClassDetailViewProps {
  klass: ClassDetail;
}

export function ClassDetailView({ klass }: ClassDetailViewProps) {
  return (
    <div className={styles.detail}>

      <h1>{klass.name}</h1>
      <p className={styles.meta}>
        <span>Dé de vie {hitDieLabel(klass.hitDie)}</span>
        <span>{klass.source ?? "Source non précisée"}</span>
      </p>

      <p className={styles.description}>{klass.description}</p>

      <dl className={styles.detailGrid}>
        <div>
          <dt>Caractéristiques principales</dt>
          <dd>{formatStringList(klass.primaryAbilities)}</dd>
        </div>
        <div>
          <dt>Jets de sauvegarde</dt>
          <dd>{formatStringList(klass.savingThrowProficiencies)}</dd>
        </div>
        <div>
          <dt>Maîtrises d&apos;armures</dt>
          <dd>{formatStringList(klass.armorProficiencies)}</dd>
        </div>
        <div>
          <dt>Maîtrises d&apos;armes</dt>
          <dd>{formatStringList(klass.weaponProficiencies)}</dd>
        </div>
        <div>
          <dt>Maîtrises d&apos;outils</dt>
          <dd>{formatStringList(klass.toolProficiencies)}</dd>
        </div>
        <div>
          <dt>Choix de compétences</dt>
          <dd>{klass.skillChoicesLabel}</dd>
        </div>
      </dl>

      <section className={styles.section}>
        <h2>Sous-classes</h2>
        {klass.subclasses.length === 0 ? (
          <p className={styles.empty}>Aucune sous-classe référencée pour le moment.</p>
        ) : (
          <ul className={styles.subclassList}>
            {klass.subclasses.map((subclass) => (
              <li key={subclass.id} className={styles.subclassItem}>
                <RefLink kind="subclass" item={subclass} />
                <span>Disponible dès le niveau {subclass.availableFromLevel}</span>
              </li>
            ))}
          </ul>
        )}
        <Link href={`${REFERENCE_PATHS.subclass}?classe=${klass.id}`} className={styles.moreLink}>
          Voir les sous-classes de {klass.name}
        </Link>
      </section>

      <section className={styles.section}>
        <h2>Aptitudes de classe</h2>
        <Link href={`${REFERENCE_PATHS.feature}?classe=${klass.id}`} className={styles.moreLink}>
          Toutes les aptitudes de {klass.name}, sous-classes comprises
        </Link>
        {klass.features.length === 0 ? (
          <p className={styles.empty}>Aucune aptitude référencée pour le moment.</p>
        ) : (
          <ul className={styles.featureList}>
            {klass.features.map((feature) => (
              <li key={feature.id} className={styles.featureItem}>
                <div className={styles.featureHeader}>
                  <RefLink kind="feature" item={feature} />
                  <span className={styles.badge}>Niveau {feature.level}</span>
                  {feature.choiceType ? (
                    <span className={styles.badge}>{feature.choiceType}</span>
                  ) : null}
                  {feature.usesPerRestLabel ? <span>{feature.usesPerRestLabel}</span> : null}
                </div>
                <p className={styles.featureDescription}>{feature.description}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ProposeModificationLink type="class" id={klass.id} />
    </div>
  );
}
