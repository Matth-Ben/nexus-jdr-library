import { formatAbilityList } from "@/lib/classes/translations";
import { renderPayload } from "./format";
import { asRecord, asStringArray, type PayloadItem, type PayloadSection } from "./payload-view";
import type { ProposalType } from "./types";

/**
 * Différences entre l'élément existant (rechargé à l'affichage) et le payload
 * d'une proposition de modification. Module PUR, calculé sur le RENDU tolérant
 * (`renderPayload`) : aucun payload malformé ni aucun existant périmé ne le
 * fait échouer.
 */

export interface ScalarChange {
  label: string;
  before: string;
  after: string;
}

export interface ListChange {
  label: string;
  added: string[];
  removed: string[];
  changed: string[];
}

export interface TextChange {
  label: string;
  before: string;
  after: string;
}

export type ItemMark = "added" | "modified";

export interface ProposalDiff {
  /** Champs simples : « avant → après » (titre compris). */
  scalars: ScalarChange[];
  /** Textes longs modifiés (description). */
  texts: TextChange[];
  /** Listes : éléments ajoutés / retirés / modifiés, par nom. */
  lists: ListChange[];
  /** Libellés des lignes de la grille de détail qui diffèrent. */
  changedRows: string[];
  /** La description affichée sous la grille diffère. */
  descriptionChanged: boolean;
  /** Titre de section → clé d'élément → marque, pour annoter la version proposée. */
  marks: Record<string, Record<string, ItemMark>>;
  hasChanges: boolean;
}

export const TITLE_LABELS: Record<ProposalType, string> = {
  spell: "Titre",
  feat: "Titre",
  item: "Titre",
  race: "Nom",
  class: "Nom",
};

/** Lignes de la grille dont la valeur est une liste : comparées élément par élément. */
const LIST_ROWS: Partial<Record<ProposalType, Record<string, (payload: Record<string, unknown>) => string[]>>> = {
  race: {
    Langues: (payload) => asStringArray(payload.languages),
  },
  class: {
    Armures: (payload) => asStringArray(payload.armor_proficiencies),
    Armes: (payload) => asStringArray(payload.weapon_proficiencies),
    Outils: (payload) => asStringArray(payload.tool_proficiencies),
    "Caractéristiques principales": (payload) => formatAbilityList(asStringArray(payload.primary_abilities)),
    "Jets de sauvegarde": (payload) => formatAbilityList(asStringArray(payload.saving_throw_proficiencies)),
  },
};

function compareLists(label: string, before: string[], after: string[]): ListChange | null {
  const key = (value: string) => value.trim().toLocaleLowerCase("fr");
  const beforeKeys = new Set(before.map(key));
  const afterKeys = new Set(after.map(key));
  const added = after.filter((value) => !beforeKeys.has(key(value)));
  const removed = before.filter((value) => !afterKeys.has(key(value)));
  return added.length > 0 || removed.length > 0 ? { label, added, removed, changed: [] } : null;
}

/** Clé d'un élément de liste : son titre, suffixé du rang d'apparition en cas de doublon. */
function keyedItems(items: readonly PayloadItem[]): { key: string; item: PayloadItem }[] {
  const seen = new Map<string, number>();
  return items.map((item) => {
    const rank = (seen.get(item.title) ?? 0) + 1;
    seen.set(item.title, rank);
    return { key: rank === 1 ? item.title : `${item.title} (${rank})`, item };
  });
}

function signature(item: PayloadItem): string {
  return JSON.stringify([item.note ?? null, item.group ?? null, item.text ?? null, item.rows ?? null, item.sections ?? null]);
}

function findSection(sections: readonly PayloadSection[], title: string): PayloadSection | undefined {
  return sections.find((section) => section.title === title);
}

export function diffContent(
  type: ProposalType,
  before: { title: string; payload: unknown },
  after: { title: string; payload: unknown },
): ProposalDiff {
  const rendered = { before: renderPayload(type, before.payload), after: renderPayload(type, after.payload) };
  const scalars: ScalarChange[] = [];
  const texts: TextChange[] = [];
  const lists: ListChange[] = [];
  const changedRows: string[] = [];
  const marks: Record<string, Record<string, ItemMark>> = {};

  const beforeTitle = before.title.trim();
  const afterTitle = after.title.trim();
  if (beforeTitle !== afterTitle) {
    scalars.push({ label: TITLE_LABELS[type], before: beforeTitle, after: afterTitle });
  }

  // Grille de détail : ligne par ligne, par libellé.
  const beforeRows = new Map(rendered.before.rows.map((row) => [row.label, row.value]));
  const afterRows = new Map(rendered.after.rows.map((row) => [row.label, row.value]));
  const listRows = LIST_ROWS[type] ?? {};
  const beforeRecord = asRecord(before.payload);
  const afterRecord = asRecord(after.payload);
  for (const label of new Set([...beforeRows.keys(), ...afterRows.keys()])) {
    const previous = beforeRows.get(label) ?? "";
    const next = afterRows.get(label) ?? "";
    if (previous === next) continue;
    changedRows.push(label);
    const extract = Object.hasOwn(listRows, label) ? listRows[label] : undefined;
    if (extract) {
      const change = compareLists(label, extract(beforeRecord), extract(afterRecord));
      // Même liste dans un ordre différent : la ligne est marquée, sans détail à résumer.
      if (change) lists.push(change);
      else scalars.push({ label, before: previous, after: next });
    } else {
      scalars.push({ label, before: previous, after: next });
    }
  }

  // Description.
  const descriptionChanged = (rendered.before.description ?? "") !== (rendered.after.description ?? "");
  if (descriptionChanged) {
    texts.push({
      label: "Description",
      before: rendered.before.description ?? "",
      after: rendered.after.description ?? "",
    });
  }

  // Listes détaillées (traits, aptitudes, sous-races, sous-classes).
  const titles = new Set([
    ...rendered.before.sections.map((section) => section.title),
    ...rendered.after.sections.map((section) => section.title),
  ]);
  for (const title of titles) {
    const previous = keyedItems(findSection(rendered.before.sections, title)?.items ?? []);
    const next = keyedItems(findSection(rendered.after.sections, title)?.items ?? []);
    const previousByKey = new Map(previous.map(({ key, item }) => [key, item]));
    const nextKeys = new Set(next.map(({ key }) => key));

    const change: ListChange = { label: title, added: [], removed: [], changed: [] };
    for (const { key, item } of next) {
      const old = previousByKey.get(key);
      if (!old) {
        change.added.push(item.title);
        (marks[title] ??= {})[key] = "added";
      } else if (signature(old) !== signature(item)) {
        change.changed.push(item.title);
        (marks[title] ??= {})[key] = "modified";
      }
    }
    for (const { key, item } of previous) {
      if (!nextKeys.has(key)) change.removed.push(item.title);
    }
    if (change.added.length > 0 || change.removed.length > 0 || change.changed.length > 0) lists.push(change);
  }

  return {
    scalars,
    texts,
    lists,
    changedRows,
    descriptionChanged,
    marks,
    hasChanges: scalars.length > 0 || texts.length > 0 || lists.length > 0 || changedRows.length > 0,
  };
}

/** Copie des sections avec `mark` posé sur les éléments ajoutés ou modifiés (version proposée). */
export function annotateSections(sections: readonly PayloadSection[], diff: ProposalDiff): PayloadSection[] {
  return sections.map((section) => {
    const sectionMarks = diff.marks[section.title];
    if (!sectionMarks) return section;
    const keys = keyedItems(section.items);
    return {
      ...section,
      items: keys.map(({ key, item }) => (sectionMarks[key] ? { ...item, mark: sectionMarks[key] } : item)),
    };
  });
}
