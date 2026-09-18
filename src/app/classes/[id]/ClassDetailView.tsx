import Link from "next/link";
import { formatStringList } from "@/lib/classes/translations";
import type { ClassDetail } from "@/lib/classes/types";
import { hitDieLabel } from "../ClassesListView";
import styles from "../classes.module.css";

export interface ClassDetailViewProps {
  klass: ClassDetail;
}

export function ClassDetailView({ klass }: ClassDetailViewProps) {
  return (
    <div className={styles.page}>
      <Link href="/classes" className={styles.backLink}>
        ← Retour à la liste des classes
      </Link>

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
                <span>{subclass.name}</span>
                <span>Disponible dès le niveau {subclass.availableFromLevel}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <h2>Aptitudes de classe</h2>
        {klass.features.length === 0 ? (
          <p className={styles.empty}>Aucune aptitude référencée pour le moment.</p>
        ) : (
          <ul className={styles.featureList}>
            {klass.features.map((feature) => (
              <li key={feature.id} className={styles.featureItem}>
                <div className={styles.featureHeader}>
                  <span>{feature.name}</span>
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
    </div>
  );
}
