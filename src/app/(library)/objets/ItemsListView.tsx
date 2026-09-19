import Link from "next/link";
import { ITEM_CATEGORIES } from "@/lib/items/filters";
import { formatCategory, formatCost } from "@/lib/items/translations";
import type { ItemListItem } from "@/lib/items/types";
import { panelHref } from "@/lib/panel";
import styles from "./objets.module.css";

export interface ItemsListViewProps {
  /** Objets déjà filtrés (recherche + catégorie), prêts à afficher. */
  items: ItemListItem[];
  /** Nombre total d'objets chargés depuis le référentiel, avant filtrage. */
  totalCount: number;
  query: string;
  category?: string;
  /** Vrai si le chargement depuis Supabase a échoué. */
  loadError: boolean;
  /** Élément actuellement ouvert dans le panneau (`?open=`), mis en surbrillance. */
  openId?: number;
}

export function formatWeight(weight: number | null): string {
  return weight === null ? "(non renseigné)" : `${weight} kg`;
}

export function ItemsListView({ items, totalCount, query, category, loadError,
  openId,
}: ItemsListViewProps) {
  return (
    <div className={styles.page}>
      <h1>Objets</h1>

      <form className={styles.filters} method="get">
        <div className={styles.field}>
          <label htmlFor="item-search-q">Recherche</label>
          <input
            id="item-search-q"
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Nom de l'objet"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="item-search-category">Catégorie</label>
          <select id="item-search-category" name="category" defaultValue={category ?? ""}>
            <option value="">Toutes les catégories</option>
            {ITEM_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {formatCategory(cat)}
              </option>
            ))}
          </select>
        </div>
        <button type="submit">Filtrer</button>
      </form>

      {loadError ? (
        <p role="alert" className={styles.error}>
          Impossible de charger les objets pour le moment. Réessaie plus tard.
        </p>
      ) : totalCount === 0 ? (
        <p className={styles.empty}>Aucun objet disponible pour le moment.</p>
      ) : items.length === 0 ? (
        <p className={styles.empty}>Aucun objet ne correspond à ces critères.</p>
      ) : (
        <>
          <p className={styles.summary}>
            {items.length} / {totalCount} objets
          </p>
          <ul className={styles.list}>
            {items.map((item) => (
              <li key={item.id} className={styles.row}>
                <Link
                  href={panelHref("/objets", { q: query, category }, item.id)}
                  scroll={false}
                  aria-current={openId === item.id ? "true" : undefined}
                  className={`${styles.rowLink} ${openId === item.id ? styles.rowLinkActive : ""}`}
                >
                  <span className={styles.name}>{item.name}</span>
                  <span className={styles.meta}>
                    <span>{formatCategory(item.category)}</span>
                    <span>{formatCost(item.cost)}</span>
                    <span>{formatWeight(item.weight)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
