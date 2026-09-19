import Link from "next/link";
import type { RaceListItem } from "@/lib/races/types";
import { panelHref } from "@/lib/panel";
import styles from "./races.module.css";

export interface RacesListViewProps {
  /** Races déjà filtrées (recherche par nom), prêtes à afficher. */
  races: RaceListItem[];
  /** Nombre total de races chargées depuis le référentiel, avant filtrage. */
  totalCount: number;
  query: string;
  /** Vrai si le chargement depuis Supabase a échoué. */
  loadError: boolean;
  /** Élément actuellement ouvert dans le panneau (`?open=`), mis en surbrillance. */
  openId?: number;
}

export function sizeLabel(size: string | null): string {
  return size ?? "Taille non précisée";
}

export function speedLabel(speed: number | null): string {
  return speed !== null ? `${speed} m` : "Vitesse non précisée";
}

export function sourceLabel(source: string | null): string {
  return source ?? "Source non précisée";
}

export function RacesListView({ races, totalCount, query, loadError,
  openId,
}: RacesListViewProps) {
  return (
    <div className={styles.page}>
      <h1>Races</h1>

      <form className={styles.filters} method="get">
        <div className={styles.field}>
          <label htmlFor="race-search-q">Recherche</label>
          <input
            id="race-search-q"
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Nom de la race"
          />
        </div>
        <button type="submit">Filtrer</button>
      </form>

      {loadError ? (
        <p role="alert" className={styles.error}>
          Impossible de charger les races pour le moment. Réessaie plus tard.
        </p>
      ) : totalCount === 0 ? (
        <p className={styles.empty}>Aucune race disponible pour le moment.</p>
      ) : races.length === 0 ? (
        <p className={styles.empty}>Aucune race ne correspond à ces critères.</p>
      ) : (
        <>
          <p className={styles.summary}>
            {races.length} / {totalCount} races
          </p>
          <ul className={styles.list}>
            {races.map((race) => (
              <li key={race.id} className={styles.row}>
                <Link
                  href={panelHref("/races", { q: query }, race.id)}
                  scroll={false}
                  aria-current={openId === race.id ? "true" : undefined}
                  className={`${styles.rowLink} ${openId === race.id ? styles.rowLinkActive : ""}`}
                >
                  <span className={styles.name}>{race.name}</span>
                  <span className={styles.meta}>
                    <span>{sizeLabel(race.size)}</span>
                    <span>{speedLabel(race.speed)}</span>
                    <span>{sourceLabel(race.source)}</span>
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
