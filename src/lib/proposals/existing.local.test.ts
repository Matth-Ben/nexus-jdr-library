import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { allowedSchoolsFor, canonicalJson, existingFormValues, isUnchanged } from "./existing";
import { fetchExisting } from "./existing-fetch";
import { validateProposal } from "./payload";
import { PROPOSAL_TYPES, type ProposalType } from "./types";

/**
 * Contrôle sur les DONNÉES RÉELLES de la pile Supabase LOCALE (seed des
 * migrations) : chaque élément existant doit se convertir en valeurs de
 * formulaire qui passent le validateur (en mode modification) et redonnent
 * exactement le payload de l'existant (donc « Aucune modification détectée »).
 *
 * Désactivé par défaut (aucun réseau dans `npm test`). Pour l'exécuter :
 *   NEXUS_LOCAL_SUPABASE_URL=http://127.0.0.1:54321 \
 *   NEXUS_LOCAL_SUPABASE_ANON_KEY=<ANON_KEY de `supabase status -o env`> \
 *   npx vitest run src/lib/proposals/existing.local.test.ts
 * L'URL doit être locale : tout autre hôte est refusé (jamais le projet distant).
 */

const url = process.env.NEXUS_LOCAL_SUPABASE_URL;
const anonKey = process.env.NEXUS_LOCAL_SUPABASE_ANON_KEY;
const enabled = Boolean(url && anonKey);

const TABLES: Record<ProposalType, string> = {
  spell: "spells",
  feat: "feats",
  item: "items",
  race: "races",
  class: "classes",
};

function toFormData(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe.skipIf(!enabled)("éléments existants de la base locale → payload valide", () => {
  it("refuse toute URL non locale", () => {
    expect(url).toMatch(/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/);
  });

  for (const type of PROPOSAL_TYPES) {
    it(`${type} : chaque élément passe le validateur et redonne son payload`, { timeout: 300_000 }, async () => {
      const client = createClient(url!, anonKey!, { auth: { persistSession: false } });
      const { data, error } = await client.from(TABLES[type]).select("id").order("id").limit(2000);
      expect(error).toBeNull();
      const ids = (data ?? []).map((row: { id: number }) => row.id);
      expect(ids.length).toBeGreaterThan(0);

      const problems: string[] = [];
      let maxBytes = 0;
      for (const id of ids) {
        const existing = await fetchExisting(client, type, id);
        if (!existing) {
          problems.push(`#${id} : introuvable`);
          continue;
        }
        const result = validateProposal(type, toFormData(existingFormValues(existing)), {
          modification: true,
          allowedSchools: allowedSchoolsFor(existing),
        });
        if (!result.ok) {
          problems.push(`#${id} « ${existing.title} » : ${JSON.stringify(result.errors)}`);
          continue;
        }
        maxBytes = Math.max(maxBytes, new TextEncoder().encode(JSON.stringify(result.payload)).length);
        if (!isUnchanged(existing, result)) {
          problems.push(
            `#${id} « ${existing.title} » : payload différent de l'existant\n  existant : ${canonicalJson(existing.payload).slice(0, 300)}\n  validé   : ${canonicalJson(result.payload).slice(0, 300)}`,
          );
        }
      }
      console.info(`[existants locaux] ${type} : ${ids.length} éléments, payload max ${maxBytes} octets`);
      expect(problems).toEqual([]);
    });
  }
});
