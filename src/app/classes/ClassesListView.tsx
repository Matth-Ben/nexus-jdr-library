import Link from "next/link";
import type { ClassListItem } from "@/lib/classes/types";
import styles from "./classes.module.css";

export interface ClassesListViewProps {
  /** Classes déjà filtrées (recherche par nom), prêtes à afficher. */
  classes: ClassListItem[];
  /** Nombre total de classes chargées depuis le référentiel, avant filtrage. */
  totalCount: number;
  query: string;
  /** Vrai si le chargement depuis Supabase a échoué. */
  loadError: boolean;
}

export function hitDieLabel(hitDie: number): string {
  return `d${hitDie}`;
}

export function ClassesListView({ classes, totalCount, query, loadError }: ClassesListViewProps) {
  return (
    <div className={styles.page}>
      <h1>Classes</h1>

      <form className={styles.filters} method="get">
        <div className={styles.field}>
          <label htmlFor="class-search-q">Recherche</label>
          <input
            id="class-search-q"
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Nom de la classe"
          />
        </div>
        <button type="submit">Filtrer</button>
      </form>

      {loadError ? (
        <p role="alert" className={styles.error}>
          Impossible de charger les classes pour le moment. Réessaie plus tard.
        </p>
      ) : totalCount === 0 ? (
        <p className={styles.empty}>Aucune classe disponible pour le moment.</p>
      ) : classes.length === 0 ? (
        <p className={styles.empty}>Aucune classe ne correspond à ces critères.</p>
      ) : (
        <>
          <p className={styles.summary}>
            {classes.length} / {totalCount} classes
          </p>
          <ul className={styles.list}>
            {classes.map((klass) => (
              <li key={klass.id} className={styles.row}>
                <Link href={`/classes/${klass.id}`} className={styles.rowLink}>
                  <span className={styles.name}>{klass.name}</span>
                  <span className={styles.meta}>
                    <span>Dé de vie {hitDieLabel(klass.hitDie)}</span>
                    <span>{klass.source ?? "Source non précisée"}</span>
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
