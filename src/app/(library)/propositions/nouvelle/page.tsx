import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { parseFormType } from "@/lib/proposals/filters";
import { TYPE_LABELS } from "@/lib/proposals/format";
import { getCurrentUser } from "@/lib/proposals/queries";
import { PROPOSAL_TYPES } from "@/lib/proposals/types";
import styles from "../propositions.module.css";
import { NewProposalForm } from "./NewProposalForm";

export const metadata: Metadata = {
  title: "Proposer du contenu — Nexus JDR Bibliothèque",
};

interface NewProposalPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function NewProposalPage({ searchParams }: NewProposalPageProps) {
  const type = parseFormType((await searchParams).type);

  const user = await getCurrentUser();
  if (!user) {
    const next = type === "spell" ? "/propositions/nouvelle" : `/propositions/nouvelle?type=${type}`;
    redirect(`/connexion?next=${encodeURIComponent(next)}`);
  }

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

      <NewProposalForm key={type} type={type} />
    </div>
  );
}
