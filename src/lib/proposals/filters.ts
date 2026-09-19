import type { RawSearchParams } from "@/lib/spells/filters";
import {
  PROPOSAL_STATUSES,
  PROPOSAL_TYPES,
  type ProposalFilters,
  type ProposalStatus,
  type ProposalType,
} from "./types";

export const DEFAULT_STATUS: ProposalStatus = "pending";

/** Nombre maximal de propositions chargées dans la liste. */
export const LIST_LIMIT = 200;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function isProposalType(value: unknown): value is ProposalType {
  return typeof value === "string" && (PROPOSAL_TYPES as readonly string[]).includes(value);
}

export function isProposalStatus(value: unknown): value is ProposalStatus {
  return typeof value === "string" && (PROPOSAL_STATUSES as readonly string[]).includes(value);
}

/**
 * Traduit `?statut=` / `?type=` en filtres sûrs : toute valeur inconnue
 * retombe sur le défaut (`pending`, tous les types) au lieu de lever une erreur.
 */
export function parseProposalFilters(searchParams: RawSearchParams): ProposalFilters {
  const rawStatus = firstValue(searchParams.statut)?.trim();
  const rawType = firstValue(searchParams.type)?.trim();
  return {
    status: isProposalStatus(rawStatus) ? rawStatus : DEFAULT_STATUS,
    type: isProposalType(rawType) ? rawType : undefined,
  };
}

/** Type demandé pour le formulaire de proposition (`?type=`), `spell` par défaut. */
export function parseFormType(raw: string | string[] | undefined): ProposalType {
  const value = firstValue(raw)?.trim();
  return isProposalType(value) ? value : "spell";
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/** Lit `?open=` : un uuid valide, sinon `undefined` (jamais transmis tel quel à la base). */
export function parseOpenUuid(raw: string | string[] | undefined): string | undefined {
  const value = firstValue(raw)?.trim();
  return isUuid(value) ? value.toLowerCase() : undefined;
}

/** Paramètres d'URL à conserver dans les liens (le statut par défaut est omis). */
export function filterParams(filters: ProposalFilters): Record<string, string | undefined> {
  return {
    statut: filters.status === DEFAULT_STATUS ? undefined : filters.status,
    type: filters.type,
  };
}
