import type { FeatDetail } from "@/lib/feats/types";
import styles from "./dons.module.css";

export interface FeatDetailViewProps {
  feat: FeatDetail;
}

export function FeatDetailView({ feat }: FeatDetailViewProps) {
  return (
    <div className={styles.detail}>

      <h1>{feat.name}</h1>
      <p className={styles.meta}>
        <span>{feat.prerequisiteText ? `Prérequis : ${feat.prerequisiteText}` : "Aucun prérequis"}</span>
      </p>

      <p className={styles.description}>{feat.description}</p>
    </div>
  );
}
