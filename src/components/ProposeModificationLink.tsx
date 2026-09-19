import Link from "next/link";
import { modificationHref } from "@/lib/proposals/target";
import type { ProposalType } from "@/lib/proposals/types";
import styles from "./ProposeModificationLink.module.css";

interface ProposeModificationLinkProps {
  type: ProposalType;
  id: number;
}

/**
 * Lien discret des panneaux de détail de la bibliothèque : ouvre le formulaire de
 * proposition prérempli avec cet élément. Visible de tous ; la page redirige un
 * visiteur vers la connexion en conservant la requête.
 */
export function ProposeModificationLink({ type, id }: ProposeModificationLinkProps) {
  return (
    <p className={styles.wrapper}>
      <Link href={modificationHref(type, id)} className={styles.link}>
        Proposer une modification
      </Link>
    </p>
  );
}
