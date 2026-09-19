import type { Metadata } from "next";
import Link from "next/link";
import styles from "../connexion/connexion.module.css";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Mot de passe oublié — Nexus JDR Bibliothèque",
};

interface ForgotPasswordPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const linkFailed = (await searchParams).erreur === "lien";

  return (
    <div className={styles.page}>
      <h1>Mot de passe oublié</h1>

      <p className={styles.intro}>
        Renseigne l&apos;adresse e-mail de ton compte : tu recevras un lien pour choisir un nouveau
        mot de passe.
      </p>

      <ForgotPasswordForm linkFailed={linkFailed} />

      <p className={styles.hint}>
        <Link href="/connexion">Retour à la connexion</Link>
      </p>
    </div>
  );
}
