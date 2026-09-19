import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { existingFormValues, type ExistingContent } from "@/lib/proposals/existing";
import { cleanSearch, fetchExisting, listExisting, type ExistingOptions } from "@/lib/proposals/existing-fetch";
import { parseFormType } from "@/lib/proposals/filters";
import { TYPE_LABELS } from "@/lib/proposals/format";
import { getCurrentUser } from "@/lib/proposals/queries";
import { libraryHref, parseTargetId } from "@/lib/proposals/target";
import { PROPOSAL_TYPES, type ProposalType } from "@/lib/proposals/types";
import { createSessionClient } from "@/lib/supabase/server";
import styles from "../propositions.module.css";
import { ExistingPicker } from "./ExistingPicker";
import { NewProposalForm } from "./NewProposalForm";

export const metadata: Metadata = {
  title: "Proposer du contenu — Nexus JDR Bibliothèque",
};

type SearchParams = Record<string, string | string[] | undefined>;

interface NewProposalPageProps {
  searchParams: Promise<SearchParams>;
}

/** Chemin complet demandé, requête comprise : c'est là que ramène la connexion. */
function requestedPath(params: SearchParams): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined) query.append(key, item);
    }
  }
  const text = query.toString();
  return text === "" ? "/propositions/nouvelle" : `/propositions/nouvelle?${text}`;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Ce que le formulaire de modification ne permet pas de changer, par type. */
const LIMITS: Partial<Record<ProposalType, string>> = {
  item: "Les propriétés d'arme et d'armure ne sont pas modifiables ici.",
  class:
    "Les aptitudes propres aux sous-classes, le type de choix des aptitudes et leurs utilisations par repos ne sont pas modifiables ici.",
};

function TargetBanner({ existing }: { existing: ExistingContent }) {
  const limit = LIMITS[existing.type];
  const notes = [...(limit ? [limit] : []), ...existing.warnings];
  return (
    <div className={styles.targetBanner}>
      <p className={styles.targetLine}>
        Tu proposes une modification de <strong>« {existing.title || "(sans nom)"} »</strong> (
        <Link href={libraryHref(existing.type, existing.id)}>voir la fiche actuelle</Link>). Le formulaire est prérempli
        avec la version actuelle : change ce que tu veux, le reste est conservé.
      </p>
      {notes.length > 0 ? (
        <ul>
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
      <p>
        <Link href={`/propositions/nouvelle?type=${existing.type}&mode=modifier`} className={styles.linkButton}>
          Choisir un autre élément
        </Link>
      </p>
    </div>
  );
}

export default async function NewProposalPage({ searchParams }: NewProposalPageProps) {
  const params = await searchParams;
  const type = parseFormType(params.type);

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/connexion?next=${encodeURIComponent(requestedPath(params))}`);
  }

  // `cible` : entier > 0, sinon ignorée. Une cible valide mais introuvable ramène au choix, avec un message.
  const targetId = parseTargetId(params.cible);
  let existing: ExistingContent | null = null;
  let notice: string | null = null;
  if (targetId !== null) {
    try {
      existing = await fetchExisting(await createSessionClient(), type, targetId);
      if (!existing) {
        notice = "L'élément demandé est introuvable (il n'existe pas ou plus). Tu peux en choisir un autre ci-dessous.";
      }
    } catch (error) {
      console.error("[propositions] échec du chargement de la cible", error);
      notice = "Impossible de charger l'élément à modifier pour le moment. Réessaie plus tard.";
    }
  }

  const modifying = existing !== null;
  const wantsPicker = !modifying && (first(params.mode) === "modifier" || (targetId !== null && notice !== null));

  let picker: { search: string; result: ExistingOptions | null } | null = null;
  if (wantsPicker) {
    const search = cleanSearch(params.q);
    let result: ExistingOptions | null = null;
    try {
      result = await listExisting(await createSessionClient(), type, search);
    } catch (error) {
      console.error("[propositions] échec du chargement des éléments existants", error);
    }
    picker = { search, result };
  }

  const typeHref = `/propositions/nouvelle?type=${type}`;
  const modeActive = wantsPicker || modifying;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Proposer du contenu</h1>
        <Link href="/propositions" className={styles.linkButton}>
          Retour aux propositions
        </Link>
      </div>

      <nav aria-label="Type de contenu">
        <ul className={styles.tabs}>
          {PROPOSAL_TYPES.map((candidate) => (
            <li key={candidate}>
              <Link
                href={`/propositions/nouvelle?type=${candidate}`}
                aria-current={candidate === type ? "page" : undefined}
                className={`${styles.tab} ${candidate === type ? styles.tabActive : ""}`}
              >
                {TYPE_LABELS[candidate]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <nav aria-label="Nature de la proposition">
        <ul className={styles.modeSwitch}>
          <li>
            <Link
              href={typeHref}
              aria-current={!modeActive ? "page" : undefined}
              className={`${styles.tab} ${!modeActive ? styles.tabActive : ""}`}
            >
              Nouveau contenu
            </Link>
          </li>
          <li>
            <Link
              href={`${typeHref}&mode=modifier`}
              aria-current={modeActive ? "page" : undefined}
              className={`${styles.tab} ${modeActive ? styles.tabActive : ""}`}
            >
              Modifier un existant
            </Link>
          </li>
        </ul>
      </nav>

      {notice ? (
        <p role="alert" className={styles.error}>
          {notice}
        </p>
      ) : null}

      {picker ? <ExistingPicker type={type} search={picker.search} result={picker.result} /> : null}

      {existing ? <TargetBanner existing={existing} /> : null}

      {!wantsPicker ? (
        <NewProposalForm
          key={`${type}-${existing ? existing.id : "nouveau"}`}
          type={type}
          target={existing ? { id: existing.id, initialValues: existingFormValues(existing) } : undefined}
        />
      ) : null}
    </div>
  );
}
