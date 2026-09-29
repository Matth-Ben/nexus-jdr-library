import Link from "next/link";
import type { ReactNode } from "react";
import type { Trait } from "@/lib/races/types";
import { refHref, type ReferenceKind } from "@/lib/reference/routes";
import type { GrantedSpell, Ref } from "@/lib/reference/types";
import styles from "./reference.module.css";

/** Lien vers la fiche d'un autre élément du référentiel. */
export function RefLink({ kind, item }: { kind: ReferenceKind; item: Ref }) {
  return (
    <Link href={refHref(kind, item.id)} className={styles.refLink}>
      {item.name}
    </Link>
  );
}

interface LinkListSectionProps<T extends Ref> {
  title: string;
  kind: ReferenceKind;
  items: readonly T[];
  empty: string;
  /** Précision affichée à droite du lien (niveau, classe...). */
  aside?: (item: T) => ReactNode;
  /** Contenu ajouté sous la liste (ex. lien « voir toutes »). */
  footer?: ReactNode;
}

/** Section « titre + liste de liens » d'une fiche. */
export function LinkListSection<T extends Ref>({
  title,
  kind,
  items,
  empty,
  aside,
  footer,
}: LinkListSectionProps<T>) {
  return (
    <section className={styles.section}>
      <h2>{title}</h2>
      {items.length === 0 ? (
        <p className={styles.empty}>{empty}</p>
      ) : (
        <ul className={styles.linkList}>
          {items.map((item) => (
            <li key={item.id} className={styles.linkItem}>
              <RefLink kind={kind} item={item} />
              {aside ? <span>{aside(item)}</span> : null}
            </li>
          ))}
        </ul>
      )}
      {footer}
    </section>
  );
}

/** Section listant des sorts accordés (sorts innés, sorts de sous-classe). */
export function SpellListSection({
  title,
  spells,
  levelLabel,
  empty,
}: {
  title: string;
  spells: readonly GrantedSpell[];
  /** Libellé du niveau (« Niveau de personnage », « Niveau de classe »). */
  levelLabel: string;
  empty: string;
}) {
  return (
    <section className={styles.section}>
      <h2>{title}</h2>
      {spells.length === 0 ? (
        <p className={styles.empty}>{empty}</p>
      ) : (
        <ul className={styles.linkList}>
          {spells.map((granted, index) => (
            <li key={`${granted.spell.id}-${index}`} className={styles.linkItem}>
              <RefLink kind="spell" item={granted.spell} />
              <span>
                {[granted.level !== null ? `${levelLabel} ${granted.level}` : null, granted.note]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function TraitList({ traits }: { traits: readonly Trait[] }) {
  return (
    <dl className={styles.traitList}>
      {traits.map((trait) => (
        <div key={trait.name} className={styles.trait}>
          <dt>{trait.name}</dt>
          <dd>{trait.description}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Charge une fiche côté serveur et l'affiche dans le panneau, avec les
 * mêmes messages d'erreur/absence que les pages existantes.
 */
export async function PanelLoader<T>({
  id,
  load,
  render,
  logTag,
}: {
  id: number;
  load: (id: number) => Promise<T | null>;
  render: (item: T) => ReactNode;
  logTag: string;
}) {
  let item: T | null = null;
  try {
    item = await load(id);
  } catch (error) {
    console.error(`[${logTag}] échec du chargement d'une fiche`, error);
    return <p role="alert">Impossible de charger cette fiche pour le moment.</p>;
  }
  if (item === null) {
    return <p>Fiche introuvable.</p>;
  }
  return render(item);
}
