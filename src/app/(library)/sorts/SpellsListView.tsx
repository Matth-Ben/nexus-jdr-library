import Link from "next/link";
import { SPELL_LEVELS } from "@/lib/spells/filters";
import type { SpellListItem } from "@/lib/spells/types";
import { panelHref } from "@/lib/panel";
import styles from "./sorts.module.css";

export interface SpellsListViewProps {
  /** Sorts déjà filtrés (recherche + niveau + école), prêts à afficher. */
  spells: SpellListItem[];
  /** Nombre total de sorts chargés depuis le référentiel, avant filtrage. */
  totalCount: number;
  /** Écoles distinctes disponibles dans le référentiel chargé, pour le filtre. */
  schools: string[];
  query: string;
  level?: number;
  school?: string;
  /** Vrai si le chargement depuis Supabase a échoué. */
  loadError: boolean;
  /** Élément actuellement ouvert dans le panneau (`?open=`), mis en surbrillance. */
  openId?: number;
}

export function levelLabel(level: number): string {
  return level === 0 ? "Tour de magie" : `Niveau ${level}`;
}

export function SpellsListView({
  spells,
  totalCount,
  schools,
  query,
  level,
  school,
  loadError,
  openId,
}: SpellsListViewProps) {
  return (
    <div className={styles.page}>
      <h1>Sorts</h1>

      <form className={styles.filters} method="get">
        <div className={styles.field}>
          <label htmlFor="spell-search-q">Recherche</label>
          <input
            id="spell-search-q"
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Nom du sort"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="spell-search-level">Niveau</label>
          <select
            id="spell-search-level"
            name="level"
            defaultValue={level !== undefined ? String(level) : ""}
          >
            <option value="">Tous les niveaux</option>
            {SPELL_LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>
                {levelLabel(lvl)}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="spell-search-school">École</label>
          <select id="spell-search-school" name="school" defaultValue={school ?? ""}>
            <option value="">Toutes les écoles</option>
            {schools.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <button type="submit">Filtrer</button>
      </form>

      {loadError ? (
        <p role="alert" className={styles.error}>
          Impossible de charger les sorts pour le moment. Réessaie plus tard.
        </p>
      ) : totalCount === 0 ? (
        <p className={styles.empty}>Aucun sort disponible pour le moment.</p>
      ) : spells.length === 0 ? (
        <p className={styles.empty}>Aucun sort ne correspond à ces critères.</p>
      ) : (
        <>
          <p className={styles.summary}>
            {spells.length} / {totalCount} sorts
          </p>
          <ul className={styles.list}>
            {spells.map((spell) => (
              <li key={spell.id} className={styles.row}>
                <Link
                  href={panelHref("/sorts", { q: query, level, school }, spell.id)}
                  scroll={false}
                  aria-current={openId === spell.id ? "true" : undefined}
                  className={`${styles.rowLink} ${openId === spell.id ? styles.rowLinkActive : ""}`}
                >
                  <span className={styles.name}>{spell.name}</span>
                  <span className={styles.meta}>
                    <span>{levelLabel(spell.level)}</span>
                    <span>{spell.school ?? "École non précisée"}</span>
                    <span>{spell.castingTime}</span>
                    {spell.concentration ? (
                      <span className={styles.badge}>Concentration</span>
                    ) : null}
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
