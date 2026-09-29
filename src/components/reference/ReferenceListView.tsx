import Link from "next/link";
import type { ReactNode } from "react";
import { panelHref } from "@/lib/panel";
import styles from "./reference.module.css";

export interface ReferenceListEntry {
  id: number;
  name: string;
  /** Informations secondaires affichées sous le nom (classe, niveau, source...). */
  meta: ReactNode[];
  /** Intitulé de groupe : les éléments consécutifs de même groupe sont regroupés. */
  group?: string;
}

export interface ReferenceSelectFilter {
  /** Nom du paramètre d'URL (`classe`, `race`, `type`...). */
  name: string;
  label: string;
  value: string;
  /** Libellé de l'option « pas de filtre ». */
  allLabel: string;
  options: { value: string; label: string }[];
}

export interface ReferenceListViewProps {
  title: string;
  /** Chemin de la page (`/sous-classes`), base des liens vers le panneau. */
  basePath: string;
  /** Phrase d'introduction sous le titre. */
  intro?: ReactNode;
  entries: ReferenceListEntry[];
  /** Nombre total d'éléments avant filtrage. */
  totalCount: number;
  query: string;
  searchPlaceholder: string;
  selects?: ReferenceSelectFilter[];
  labels: {
    /** Pluriel utilisé dans le compteur (« sous-classes »). */
    plural: string;
    emptyAll: string;
    emptyFiltered: string;
    loadError: string;
  };
  loadError: boolean;
  openId?: number;
}

function groupEntries(entries: readonly ReferenceListEntry[]) {
  const groups: { title: string | undefined; entries: ReferenceListEntry[] }[] = [];
  for (const entry of entries) {
    const last = groups.at(-1);
    if (last && last.title === entry.group) {
      last.entries.push(entry);
    } else {
      groups.push({ title: entry.group, entries: [entry] });
    }
  }
  return groups;
}

/**
 * Liste consultable commune aux pages du référentiel (sous-races,
 * sous-classes, aptitudes, invocations, lignées...) : recherche, filtres par
 * liste déroulante, et ouverture d'une fiche dans le panneau (`?open=`).
 */
export function ReferenceListView({
  title,
  basePath,
  intro,
  entries,
  totalCount,
  query,
  searchPlaceholder,
  selects = [],
  labels,
  loadError,
  openId,
}: ReferenceListViewProps) {
  const filters: Record<string, string> = { q: query };
  for (const select of selects) {
    filters[select.name] = select.value;
  }
  const idPrefix = basePath.slice(1);

  return (
    <div className={styles.page}>
      <h1>{title}</h1>
      {intro ? <p className={styles.intro}>{intro}</p> : null}

      <form className={styles.filters} method="get">
        <div className={styles.field}>
          <label htmlFor={`${idPrefix}-search-q`}>Recherche</label>
          <input
            id={`${idPrefix}-search-q`}
            type="text"
            name="q"
            defaultValue={query}
            placeholder={searchPlaceholder}
          />
        </div>
        {selects.map((select) => (
          <div key={select.name} className={styles.field}>
            <label htmlFor={`${idPrefix}-filter-${select.name}`}>{select.label}</label>
            <select
              id={`${idPrefix}-filter-${select.name}`}
              name={select.name}
              defaultValue={select.value}
            >
              <option value="">{select.allLabel}</option>
              {select.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ))}
        <button type="submit">Filtrer</button>
      </form>

      {loadError ? (
        <p role="alert" className={styles.error}>
          {labels.loadError}
        </p>
      ) : totalCount === 0 ? (
        <p className={styles.empty}>{labels.emptyAll}</p>
      ) : entries.length === 0 ? (
        <p className={styles.empty}>{labels.emptyFiltered}</p>
      ) : (
        <>
          <p className={styles.summary}>
            {entries.length} / {totalCount} {labels.plural}
          </p>
          {groupEntries(entries).map((group, index) => (
            <section key={`${group.title ?? ""}-${index}`} className={styles.group}>
              {group.title ? <h2 className={styles.groupTitle}>{group.title}</h2> : null}
              <ul className={styles.list}>
                {group.entries.map((entry) => (
                  <li key={entry.id} className={styles.row}>
                    <Link
                      href={panelHref(basePath, filters, entry.id)}
                      scroll={false}
                      aria-current={openId === entry.id ? "true" : undefined}
                      className={`${styles.rowLink} ${openId === entry.id ? styles.rowLinkActive : ""}`}
                    >
                      <span className={styles.name}>{entry.name}</span>
                      {entry.meta.length > 0 ? (
                        <span className={styles.meta}>
                          {entry.meta.map((item, metaIndex) => (
                            <span key={metaIndex}>{item}</span>
                          ))}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
