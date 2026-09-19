import { formatCategory, formatCost } from "@/lib/items/translations";
import { formatComponents } from "@/lib/spells/translations";
import { RARITY_LABELS } from "./payload";
import type { ProposalStatus, ProposalType } from "./types";

export const TYPE_LABELS: Record<ProposalType, string> = {
  spell: "Sort",
  feat: "Don",
  item: "Objet",
};

export const STATUS_LABELS: Record<ProposalStatus, string> = {
  pending: "En attente",
  approved: "Approuvée",
  rejected: "Refusée",
};

const MISSING_TEXT = "(non renseigné)";

/** Nom de l'auteur : jamais l'e-mail, « Membre » quand le nom n'est pas renseigné. */
export function authorLabel(name: string | null | undefined): string {
  const trimmed = name?.trim();
  return trimmed ? trimmed : "Membre";
}

/** Date au format français ("19 septembre 2026"), fuseau fixe pour un rendu serveur stable. */
export function formatProposalDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  }).format(date);
}

export function levelLabel(level: number): string {
  return level === 0 ? "Tour de magie" : `Niveau ${level}`;
}

export interface PayloadRow {
  label: string;
  value: string;
}

export interface RenderedPayload {
  rows: PayloadRow[];
  /** Texte long, affiché sous la grille. `null` si absent ou illisible. */
  description: string | null;
}

// --- Lecture défensive : le payload n'est validé par aucune contrainte en base ---

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function yesNo(value: unknown): string {
  return value === true ? "Oui" : "Non";
}

function formatWeight(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 4 }).format(value)} kg`;
}

function spellRows(payload: Record<string, unknown>): PayloadRow[] {
  const level = payload.level;
  const components = asRecord(payload.components);
  const hasComponents = typeof payload.components === "object" && payload.components !== null;
  return [
    {
      label: "Niveau",
      value:
        typeof level === "number" && Number.isInteger(level) && level >= 0 && level <= 9
          ? levelLabel(level)
          : MISSING_TEXT,
    },
    { label: "École", value: asText(payload.school) ?? MISSING_TEXT },
    { label: "Temps d'incantation", value: asText(payload.casting_time) ?? MISSING_TEXT },
    { label: "Portée", value: asText(payload.range) ?? MISSING_TEXT },
    {
      label: "Composantes",
      value: formatComponents(
        hasComponents
          ? {
              verbal: components.verbal === true,
              somatic: components.somatic === true,
              material: components.material === true,
            }
          : null,
      ),
    },
    { label: "Durée", value: asText(payload.duration) ?? MISSING_TEXT },
    { label: "Concentration", value: yesNo(payload.concentration) },
    { label: "Rituel", value: yesNo(payload.ritual) },
  ];
}

function featRows(payload: Record<string, unknown>): PayloadRow[] {
  return [{ label: "Prérequis", value: asText(payload.prerequisite) ?? "Aucun" }];
}

function itemRows(payload: Record<string, unknown>): PayloadRow[] {
  const category = asText(payload.category);
  const rows: PayloadRow[] = [{ label: "Catégorie", value: category ? formatCategory(category) : MISSING_TEXT }];

  const cost = asRecord(payload.cost);
  if (typeof cost.amount === "number" && typeof cost.currency === "string") {
    rows.push({ label: "Coût", value: formatCost({ amount: cost.amount, currency: cost.currency }) });
  }
  const weight = formatWeight(payload.weight);
  if (weight) rows.push({ label: "Poids", value: weight });

  const rarity = asText(payload.rarity);
  if (rarity) {
    rows.push({
      label: "Rareté",
      value: Object.hasOwn(RARITY_LABELS, rarity) ? RARITY_LABELS[rarity as keyof typeof RARITY_LABELS] : rarity,
    });
  }
  rows.push({ label: "Nécessite un lien", value: yesNo(payload.requires_attunement) });
  rows.push({ label: "Consommable", value: yesNo(payload.consumable) });
  return rows;
}

/** Rend le payload d'une proposition en lignes label/valeur + description, quelle que soit sa forme. */
export function renderPayload(type: ProposalType, payload: unknown): RenderedPayload {
  const record = asRecord(payload);
  const rows = type === "spell" ? spellRows(record) : type === "feat" ? featRows(record) : itemRows(record);
  return { rows, description: asText(record.description) };
}
