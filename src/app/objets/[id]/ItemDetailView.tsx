import Link from "next/link";
import { formatAcDexBonus, formatCategory, formatCost, formatRange } from "@/lib/items/translations";
import type { ItemDetail } from "@/lib/items/types";
import { formatWeight } from "../ItemsListView";
import styles from "../objets.module.css";

export interface ItemDetailViewProps {
  item: ItemDetail;
}

export function ItemDetailView({ item }: ItemDetailViewProps) {
  return (
    <div className={styles.page}>
      <Link href="/objets" className={styles.backLink}>
        ← Retour à la liste des objets
      </Link>

      <h1>{item.name}</h1>
      <p className={styles.meta}>
        <span>{formatCategory(item.category)}</span>
        {item.requiresAttunement ? <span className={styles.badge}>Nécessite un lien</span> : null}
        {item.consumable ? <span className={styles.badge}>Consommable</span> : null}
      </p>

      <dl className={styles.detailGrid}>
        <div>
          <dt>Coût</dt>
          <dd>{formatCost(item.cost)}</dd>
        </div>
        <div>
          <dt>Poids</dt>
          <dd>{formatWeight(item.weight)}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{item.source ?? "(non renseigné)"}</dd>
        </div>
        {item.rarity ? (
          <div>
            <dt>Rareté</dt>
            <dd>{item.rarity}</dd>
          </div>
        ) : null}
      </dl>

      <p className={styles.description}>{item.description}</p>

      {item.weaponProperties ? (
        <>
          <h2 className={styles.sectionTitle}>Propriétés d&apos;arme</h2>
          <dl className={styles.detailGrid}>
            <div>
              <dt>Dégâts</dt>
              <dd>{item.weaponProperties.damage_dice ?? "(non renseigné)"}</dd>
            </div>
            <div>
              <dt>Type de dégâts</dt>
              <dd>{item.weaponProperties.damage_type ?? "(non renseigné)"}</dd>
            </div>
            <div>
              <dt>Propriétés</dt>
              <dd>
                {item.weaponProperties.properties.length > 0
                  ? item.weaponProperties.properties.join(", ")
                  : "Aucune"}
              </dd>
            </div>
            <div>
              <dt>Portée</dt>
              <dd>{formatRange(item.weaponProperties.range)}</dd>
            </div>
          </dl>
        </>
      ) : null}

      {item.armorProperties ? (
        <>
          <h2 className={styles.sectionTitle}>Propriétés d&apos;armure</h2>
          <dl className={styles.detailGrid}>
            <div>
              <dt>CA de base</dt>
              <dd>{item.armorProperties.ac_base}</dd>
            </div>
            <div>
              <dt>Bonus de Dex</dt>
              <dd>{formatAcDexBonus(item.armorProperties.ac_dex_bonus)}</dd>
            </div>
            <div>
              <dt>Force requise</dt>
              <dd>
                {item.armorProperties.strength_requirement === null
                  ? "Aucune"
                  : item.armorProperties.strength_requirement}
              </dd>
            </div>
            <div>
              <dt>Désavantage discrétion</dt>
              <dd>{item.armorProperties.stealth_disadvantage ? "Oui" : "Non"}</dd>
            </div>
          </dl>
        </>
      ) : null}
    </div>
  );
}
