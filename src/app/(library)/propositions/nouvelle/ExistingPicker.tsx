import Link from "next/link";
import { formatCategory } from "@/lib/items/translations";
import { PICKER_LIMIT, SEARCH_MAX_LENGTH, type ExistingOptions } from "@/lib/proposals/existing-fetch";
import { levelLabel } from "@/lib/proposals/format";
import { modificationHref } from "@/lib/proposals/target";
import type { ProposalType } from "@/lib/proposals/types";
import styles from "../propositions.module.css";

const PLURALS: Record<ProposalType, string> = {
  spell: "sorts",
  feat: "dons",
  item: "objets",
  race: "races",
  class: "classes",
};

function hintLabel(type: ProposalType, hint: string | undefined): string | null {
  if (hint === undefined) return null;
  if (type === "spell") {
    const level = Number(hint);
    return Number.isInteger(level) ? levelLabel(level) : null;
  }
  if (type === "item") return formatCategory(hint);
  return null;
}

export interface ExistingPickerProps {
  type: ProposalType;
  /** Recherche en cours (déjà nettoyée). */
  search: string;
  /** `null` : la liste n'a pas pu être chargée. */
  result: ExistingOptions | null;
}

/** Choix de l'élément à modifier : recherche par nom (GET `q`) puis liste cliquable. */
export function ExistingPicker({ type, search, result }: ExistingPickerProps) {
  const plural = PLURALS[type];
  return (
    <section className={styles.section} aria-label="Choisir l'élément à modifier">
      <form className={styles.filters} method="get" action="/propositions/nouvelle">
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="mode" value="modifier" />
        <div className={styles.field}>
          <label htmlFor="existing-search">Rechercher par nom</label>
          <input id="existing-search" name="q" type="search" defaultValue={search} maxLength={SEARCH_MAX_LENGTH} />
        </div>
        <button type="submit">Rechercher</button>
      </form>

      {result === null ? (
        <p role="alert" className={styles.error}>
          Impossible de charger la liste pour le moment. Réessaie plus tard.
        </p>
      ) : result.options.length === 0 ? (
        <p className={styles.empty}>
          {search ? `Aucun élément ne correspond à « ${search} ».` : "Aucun élément à modifier pour le moment."}
        </p>
      ) : (
        <>
          <p className={styles.pickerSummary}>
            {result.total > result.options.length
              ? `${result.options.length} ${plural} affichés sur ${result.total} : précise ta recherche pour voir les autres (${PICKER_LIMIT} au maximum).`
              : `${result.total} ${plural}.`}
          </p>
          <ul className={styles.list}>
            {result.options.map((option) => {
              const hint = hintLabel(type, option.hint);
              return (
                <li key={option.id} className={styles.row}>
                  <Link href={modificationHref(type, option.id)} className={styles.rowLink}>
                    <span className={styles.rowTop}>
                      <span className={styles.name}>{option.name}</span>
                      {hint ? <span className={styles.pickerHint}>{hint}</span> : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
