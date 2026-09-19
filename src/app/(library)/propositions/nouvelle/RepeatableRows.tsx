"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
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
 * - Chaque ligne est un volet repliable (`aria-expanded`) pour éviter de longs
 *   défilements : au-delà de `collapseAbove` lignes, elles démarrent repliées,
 *   sauf celles qui portent une erreur ; une ligne ajoutée s'ouvre. Le contenu
 *   replié reste dans le DOM (simplement masqué) : il est soumis avec le
 *   formulaire. Sans JavaScript, tout reste déplié.
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
  /**
   * Texte affiché à côté du titre d'une ligne (ex. le nom saisi).
   * `read(sous-champ)` renvoie la valeur courante d'un champ de la ligne.
   */
  summary?: (read: (sub: string) => string) => string;
  /** Au-delà de ce nombre de lignes au montage, elles démarrent repliées (3 par défaut). */
  collapseAbove?: number;
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
  summary,
  collapseAbove = 3,
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
  const [open, setOpen] = useState<Record<number, boolean>>(() => {
    const count = Math.max(submitted.length, 1);
    const collapse = count > collapseAbove;
    const state: Record<number, boolean> = {};
    for (let index = 0; index < count; index += 1) {
      const errorPrefix = errorName !== null && index < submitted.length ? `${errorName}.${index}` : null;
      const hasError =
        errorPrefix !== null &&
        Object.keys(errors).some((key) => key === errorPrefix || key.startsWith(`${errorPrefix}.`));
      state[index] = !collapse || hasError;
    }
    return state;
  });
  // Résumés à jour de ce qui est en cours de saisie (par clé de ligne) ; à défaut, ceux des valeurs initiales.
  const [labels, setLabels] = useState<Record<number, string>>({});
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
    const row = listRef.current?.querySelector<HTMLElement>(`[data-row-key="${target.key}"]`);
    if (!row) return;
    // Ligne repliée : le focus va sur son bouton de volet, ses champs ne sont pas visibles.
    const body = Array.from(row.children).find((child) => child.hasAttribute("data-row-body"));
    if (body?.hasAttribute("hidden")) {
      row.querySelector<HTMLElement>("[data-row-toggle]")?.focus();
      return;
    }
    body?.querySelector<HTMLElement>("input, textarea, select")?.focus();
  }, [rows]);

  const add = () => {
    if (rows.length >= max) return;
    const key = Math.max(-1, ...rows.map((row) => row.key)) + 1;
    pendingFocus.current = { kind: "row", key };
    setOpen({ ...open, [key]: true });
    setRows([...rows, { key, initial: null }]);
  };

  const remove = (position: number) => {
    if (rows.length <= min) return;
    const next = rows.filter((_, index) => index !== position);
    const neighbour = next[position] ?? next[position - 1];
    pendingFocus.current = neighbour ? { kind: "row", key: neighbour.key } : { kind: "add" };
    setRows(next);
  };

  const isOpen = (key: number) => open[key] ?? true;
  const allOpen = rows.every((row) => isOpen(row.key));
  const setAllOpen = (value: boolean) => setOpen(Object.fromEntries(rows.map((row) => [row.key, value])));

  // Met à jour le résumé de la ligne dont un champ vient d'être modifié. Une liste imbriquée
  // remonte aussi ses événements : on remonte jusqu'à la ligne enfant DIRECTE de cette liste.
  const onInput = (event: FormEvent<HTMLOListElement>) => {
    if (!summary) return;
    let element = event.target as HTMLElement | null;
    while (element && element.parentElement !== event.currentTarget) element = element.parentElement;
    if (!element) return;
    const row = element;
    const key = Number(row.dataset.rowKey);
    const position = Array.from(event.currentTarget.children).indexOf(row);
    const read = (sub: string) =>
      row.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        `[name="${name}.${position}.${sub}"]`,
      )?.value ?? "";
    setLabels((current) => ({ ...current, [key]: summary(read).trim() }));
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

      <ol ref={listRef} className={styles.repeatableRows} onInput={onInput}>
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
          const rowOpen = isOpen(row.key);
          const title = `${itemLabel} ${position + 1}${itemContext}`;
          const bodyId = `${name.replaceAll(".", "-")}-row-${row.key}-body`;
          const label =
            labels[row.key] ?? (summary ? summary((sub) => context.field(sub).defaultValue).trim() : "");
          return (
            <li key={row.key} data-row-key={row.key} className={styles.repeatableRow}>
              <div className={styles.repeatableHeader}>
                {hydrated ? (
                  <button
                    type="button"
                    className={styles.rowToggle}
                    data-row-toggle
                    aria-expanded={rowOpen}
                    aria-controls={bodyId}
                    onClick={() => setOpen({ ...open, [row.key]: !rowOpen })}
                  >
                    <span aria-hidden="true" className={styles.rowChevron}>
                      {rowOpen ? "▾" : "▸"}
                    </span>
                    <strong>{title}</strong>
                    {label ? <span className={styles.rowSummary}>{label}</span> : null}
                  </button>
                ) : (
                  <strong>{title}</strong>
                )}
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
              <div id={bodyId} data-row-body hidden={hydrated && !rowOpen} className={styles.repeatableBody}>
                {children(context)}
              </div>
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
        {hydrated && rows.length > 1 ? (
          <button
            type="button"
            className={styles.secondaryButton}
            aria-label={`${allOpen ? "Tout replier" : "Tout déplier"} : ${legend}`}
            onClick={() => setAllOpen(!allOpen)}
          >
            {allOpen ? "Tout replier" : "Tout déplier"}
          </button>
        ) : null}
        <span className={styles.counter} aria-live="polite">
          {rows.length} / {max}
        </span>
      </div>
    </fieldset>
  );
}
