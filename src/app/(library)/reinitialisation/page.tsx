import type { Metadata } from "next";
import Link from "next/link";
import { createSessionClient } from "@/lib/supabase/server";
import styles from "../connexion/connexion.module.css";
import { NewPasswordForm } from "./NewPasswordForm";

export const metadata: Metadata = {
  title: "Nouveau mot de passe — Nexus JDR Bibliothèque",
};

export default async function ResetPasswordPage() {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className={styles.page}>
      <h1>Nouveau mot de passe</h1>

      {user ? (
        <NewPasswordForm />
      ) : (
        <>
          <p role="alert" className={styles.error}>
            Ce lien est invalide ou a expiré.
          </p>
          <p className={styles.hint}>
            <Link href="/mot-de-passe-oublie">Demander un nouveau lien</Link>
          </p>
        </>
      )}
    </div>
  );
}
