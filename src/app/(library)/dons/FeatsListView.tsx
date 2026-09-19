import Link from "next/link";
import type { FeatListItem } from "@/lib/feats/types";
import { panelHref } from "@/lib/panel";
import styles from "./dons.module.css";

export interface FeatsListViewProps {
  /** Dons déjà filtrés (recherche par nom), prêts à afficher. */
  feats: FeatListItem[];
  /** Nombre total de dons chargés depuis le référentiel, avant filtrage. */
  totalCount: number;
  query: string;
  /** Vrai si le chargement depuis Supabase a échoué. */
  loadError: boolean;
  /** Élément actuellement ouvert dans le panneau (`?open=`), mis en surbrillance. */
  openId?: number;
}

export function FeatsListView({ feats, totalCount, query, loadError,
  openId,
}: FeatsListViewProps) {
  return (
    <div className={styles.page}>
      <h1>Dons</h1>

      <form className={styles.filters} method="get">
        <div className={styles.field}>
          <label htmlFor="feat-search-q">Recherche</label>
          <input
            id="feat-search-q"
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Nom du don"
          />
        </div>
        <button type="submit">Filtrer</button>
      </form>

      {loadError ? (
        <p role="alert" className={styles.error}>
          Impossible de charger les dons pour le moment. Réessaie plus tard.
        </p>
      ) : totalCount === 0 ? (
        <p className={styles.empty}>Aucun don disponible pour le moment.</p>
      ) : feats.length === 0 ? (
        <p className={styles.empty}>Aucun don ne correspond à ces critères.</p>
      ) : (
        <>
          <p className={styles.summary}>
            {feats.length} / {totalCount} dons
          </p>
          <ul className={styles.list}>
            {feats.map((feat) => (
              <li key={feat.id} className={styles.row}>
                <Link
                  href={panelHref("/dons", { q: query }, feat.id)}
                  scroll={false}
                  aria-current={openId === feat.id ? "true" : undefined}
                  className={`${styles.rowLink} ${openId === feat.id ? styles.rowLinkActive : ""}`}
                >
                  <span className={styles.name}>{feat.name}</span>
                  {feat.prerequisiteText ? (
                    <span className={styles.meta}>
                      <span>Prérequis : {feat.prerequisiteText}</span>
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
