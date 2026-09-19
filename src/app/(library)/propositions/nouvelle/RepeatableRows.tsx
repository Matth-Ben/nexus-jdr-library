"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { submittedIndexes } from "@/lib/proposals/rows";
import styles from "../propositions.module.css";

/**
 * Liste de lignes ajoutables / supprimables dont les champs sont soumis sous
 * des noms indexés (`traits.0.name`, `subraces.1.traits.0.description`) : le
 * validateur serveur (`lib/proposals/rows.ts`) les reconstruit en tableaux.
 *
 * - Les noms suivent la POSITION courante des lignes (toujours contigus) ;
 *   les valeurs par défaut et les erreurs sont attachées à la ligne d'origine
 *   (rang soumis), donc elles restent à côté du bon champ après un ajout ou une
 *   suppression.
 * - Sans JavaScript, la première ligne est rendue et soumise ; les boutons
 *   « Ajouter »/« Supprimer », inertes sans JS, restent cachés jusqu'à l'hydratation.
 * - Après une erreur de validation, le parent remonte le composant (`key`) pour
 *   reconstruire toutes les lignes saisies depuis `values`.
 */

export interface RowField {
  name: string;
  defaultValue: string;
  error?: string;
}

export interface RowContext {
  /** Position courante (0, 1, …). */
  position: number;
  /** Préfixe des noms de champs de la ligne : `traits.2`. */
  name: string;
  /** Préfixe des valeurs soumises précédemment (`null` pour une ligne ajoutée). */
  valueName: string | null;
  /** Préfixe des erreurs (rang soumis ; `null` pour une ligne ajoutée). */
  errorName: string | null;
  /** Nom, valeur par défaut et erreur d'un champ simple de la ligne. */
  field: (sub: string) => RowField;
}

export interface RepeatableRowsProps {
  /** Préfixe des noms de champs : `traits`, `subraces.0.traits`. */
  name: string;
  /** Préfixe des valeurs soumises précédemment (`null` : aucune). */
  valueName: string | null;
  /** Préfixe des erreurs (`null` : aucune). */
  errorName: string | null;
  values: Record<string, string>;
  errors: Record<string, string>;
  legend: string;
  /** Nom d'une ligne, ex. « Trait » → « Trait 1 ». */
  itemLabel: string;
  addLabel: string;
  /** Précision ajoutée après le numéro (« de la sous-race 2 ») pour distinguer les listes imbriquées. */
  itemContext?: string;
  /** Nombre minimal de lignes (le bouton Supprimer se désactive à cette borne). */
  min?: number;
  max: number;
  hint?: string;
  children: (row: RowContext) => ReactNode;
}

interface RowState {
  key: number;
  /** Rang dans les lignes soumises précédemment, `null` pour une ligne ajoutée. */
  initial: number | null;
}

const subscribe = () => () => {};

/** Faux au rendu serveur, vrai une fois le JavaScript actif. */
function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

type Focus = { kind: "row"; key: number } | { kind: "add" };

export function RepeatableRows({
  name,
  valueName,
  errorName,
  values,
  errors,
  legend,
  itemLabel,
  addLabel,
  itemContext = "",
  min = 0,
  max,
  hint,
  children,
}: RepeatableRowsProps) {
  const hydrated = useHydrated();
  // Index bruts des lignes soumises précédemment, figés au montage (le parent remonte le composant à chaque soumission).
  const [submitted] = useState<number[]>(() => (valueName === null ? [] : submittedIndexes(values, valueName)));
  const [rows, setRows] = useState<RowState[]>(() =>
    Array.from({ length: Math.max(submitted.length, 1) }, (_, index) => ({
      key: index,
      initial: index < submitted.length ? index : null,
    })),
  );
  const listRef = useRef<HTMLOListElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<Focus | null>(null);

  useEffect(() => {
    const target = pendingFocus.current;
    pendingFocus.current = null;
    if (!target) return;
    if (target.kind === "add") {
      addRef.current?.focus();
      return;
    }
    const row = listRef.current?.querySelector(`[data-row-key="${target.key}"]`);
    row?.querySelector<HTMLElement>("input, textarea, select")?.focus();
  }, [rows]);

  const add = () => {
    if (rows.length >= max) return;
    const key = Math.max(-1, ...rows.map((row) => row.key)) + 1;
    pendingFocus.current = { kind: "row", key };
    setRows([...rows, { key, initial: null }]);
  };

  const remove = (position: number) => {
    if (rows.length <= min) return;
    const next = rows.filter((_, index) => index !== position);
    const neighbour = next[position] ?? next[position - 1];
    pendingFocus.current = neighbour ? { kind: "row", key: neighbour.key } : { kind: "add" };
    setRows(next);
  };

  const listError = errorName !== null ? errors[errorName] : undefined;
  const errorId = `${name.replaceAll(".", "-")}-list-error`;

  return (
    <fieldset className={styles.repeatable} aria-describedby={listError ? errorId : undefined}>
      <legend>{legend}</legend>
      {hint ? <p className={styles.hint}>{hint}</p> : null}
      {listError ? (
        <span id={errorId} role="alert" className={styles.inlineError}>
          {listError}
        </span>
      ) : null}

      <ol ref={listRef} className={styles.repeatableRows}>
        {rows.map((row, position) => {
          const rowName = `${name}.${position}`;
          const rawIndex = row.initial !== null ? submitted[row.initial] : undefined;
          const rowValueName = valueName !== null && rawIndex !== undefined ? `${valueName}.${rawIndex}` : null;
          const rowErrorName = errorName !== null && row.initial !== null ? `${errorName}.${row.initial}` : null;
          const context: RowContext = {
            position,
            name: rowName,
            valueName: rowValueName,
            errorName: rowErrorName,
            field: (sub) => ({
              name: `${rowName}.${sub}`,
              defaultValue: rowValueName !== null ? (values[`${rowValueName}.${sub}`] ?? "") : "",
              error: rowErrorName !== null ? errors[`${rowErrorName}.${sub}`] : undefined,
            }),
          };
          return (
            <li key={row.key} data-row-key={row.key} className={styles.repeatableRow}>
              <div className={styles.repeatableHeader}>
                <strong>
                  {itemLabel} {position + 1}
                  {itemContext}
                </strong>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  hidden={!hydrated}
                  disabled={rows.length <= min}
                  aria-label={`Supprimer ${itemLabel.toLowerCase()} ${position + 1}${itemContext}`}
                  onClick={() => remove(position)}
                >
                  Supprimer
                </button>
              </div>
              {children(context)}
            </li>
          );
        })}
      </ol>

      <div className={styles.repeatableFooter}>
        <button
          ref={addRef}
          type="button"
          className={styles.secondaryButton}
          hidden={!hydrated}
          disabled={rows.length >= max}
          onClick={add}
        >
          {addLabel}
        </button>
        <span className={styles.counter} aria-live="polite">
          {rows.length} / {max}
        </span>
      </div>
    </fieldset>
  );
}
