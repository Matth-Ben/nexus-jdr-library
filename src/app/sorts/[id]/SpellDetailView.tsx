import Link from "next/link";
import type { SpellDetail } from "@/lib/spells/types";
import { levelLabel } from "../SpellsListView";
import styles from "../sorts.module.css";

export interface SpellDetailViewProps {
  spell: SpellDetail;
}

export function SpellDetailView({ spell }: SpellDetailViewProps) {
  return (
    <div className={styles.page}>
      <Link href="/sorts" className={styles.backLink}>
        ← Retour à la liste des sorts
      </Link>

      <h1>{spell.name}</h1>
      <p className={styles.meta}>
        <span>{levelLabel(spell.level)}</span>
        <span>{spell.school ?? "École non précisée"}</span>
        {spell.concentration ? <span className={styles.badge}>Concentration</span> : null}
      </p>

      <dl className={styles.detailGrid}>
        <div>
          <dt>Temps d&apos;incantation</dt>
          <dd>{spell.castingTime}</dd>
        </div>
        <div>
          <dt>Portée</dt>
          <dd>{spell.range}</dd>
        </div>
        <div>
          <dt>Composantes</dt>
          <dd>{spell.components}</dd>
        </div>
        <div>
          <dt>Durée</dt>
          <dd>{spell.duration}</dd>
        </div>
      </dl>

      <p className={styles.description}>{spell.description}</p>
    </div>
  );
}
