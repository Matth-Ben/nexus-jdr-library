import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/auth/redirect";
import { createSessionClient } from "@/lib/supabase/server";
import styles from "./connexion.module.css";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Connexion — Nexus JDR Bibliothèque",
};

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const next = safeNextPath((await searchParams).next);

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect(next);
  }

  return (
    <div className={styles.page}>
      <h1>Connexion</h1>
      <p className={styles.intro}>
        La bibliothèque est consultable sans compte. Connecte-toi pour proposer du contenu, commenter
        et voter.
      </p>

      <LoginForm next={next} />

      <p className={styles.hint}>
        Pas encore de compte ? L&apos;inscription se fait depuis l&apos;application mobile Nexus JDR ;
        utilise ensuite les mêmes identifiants ici.
      </p>
    </div>
  );
}
