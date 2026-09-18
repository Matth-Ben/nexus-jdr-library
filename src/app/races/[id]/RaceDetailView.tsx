import Link from "next/link";
import type { RaceDetail } from "@/lib/races/types";
import { sizeLabel, sourceLabel, speedLabel } from "../RacesListView";
import styles from "../races.module.css";

export interface RaceDetailViewProps {
  race: RaceDetail;
}

export function RaceDetailView({ race }: RaceDetailViewProps) {
  return (
    <div className={styles.page}>
      <Link href="/races" className={styles.backLink}>
        ← Retour à la liste des races
      </Link>

      <h1>{race.name}</h1>
      <p className={styles.meta}>
        <span>{sourceLabel(race.source)}</span>
      </p>

      <dl className={styles.detailGrid}>
        <div>
          <dt>Taille</dt>
          <dd>{sizeLabel(race.size)}</dd>
        </div>
        <div>
          <dt>Vitesse</dt>
          <dd>{speedLabel(race.speed)}</dd>
        </div>
        <div>
          <dt>Bonus de caractéristiques</dt>
          <dd>{race.abilityBonuses}</dd>
        </div>
        <div>
          <dt>Langues</dt>
          <dd>
            {race.languages.length > 0 ? (
              <ul className={styles.languageList}>
                {race.languages.map((language) => (
                  <li key={language} className={styles.languageBadge}>
                    {language}
                  </li>
                ))}
              </ul>
            ) : (
              "Non renseignées"
            )}
          </dd>
        </div>
      </dl>

      <div className={styles.section}>
        <h2>Traits</h2>
        {race.traits.length > 0 ? (
          <dl className={styles.traitList}>
            {race.traits.map((trait) => (
              <div key={trait.name} className={styles.trait}>
                <dt>{trait.name}</dt>
                <dd>{trait.description}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className={styles.empty}>Aucun trait renseigné.</p>
        )}
      </div>

      <div className={styles.section}>
        <h2>Sous-races</h2>
        {race.subraces.length > 0 ? (
          <div className={styles.subraceList}>
            {race.subraces.map((subrace) => (
              <div key={subrace.id} className={styles.subraceCard}>
                <h3>{subrace.name}</h3>
                <p className={styles.meta}>
                  <span>{subrace.abilityBonuses}</span>
                </p>
                {subrace.traits.length > 0 ? (
                  <dl className={styles.traitList}>
                    {subrace.traits.map((trait) => (
                      <div key={trait.name} className={styles.trait}>
                        <dt>{trait.name}</dt>
                        <dd>{trait.description}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>Cette race n&apos;a pas de sous-race.</p>
        )}
      </div>
    </div>
  );
}
