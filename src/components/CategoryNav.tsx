"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/(library)/connexion/actions";
import styles from "./CategoryNav.module.css";

const CATEGORIES = [
  { href: "/sorts", label: "Sorts" },
  { href: "/classes", label: "Classes" },
  { href: "/races", label: "Races" },
  { href: "/dons", label: "Dons" },
  { href: "/objets", label: "Objets" },
] as const;

interface CategoryNavProps {
  /** E-mail de l'utilisateur connecté, `null` pour un visiteur. */
  userEmail: string | null;
}

const AUTH_PATHS = ["/connexion", "/mot-de-passe-oublie", "/reinitialisation"];

export function CategoryNav({ userEmail }: CategoryNavProps) {
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <nav className={styles.nav} aria-label="Catégories de la bibliothèque">
        <Link href="/" className={styles.brand}>
          Nexus JDR
        </Link>
        <ul className={styles.list}>
          {CATEGORIES.map((category) => {
            const active = pathname === category.href || pathname.startsWith(`${category.href}/`);
            return (
              <li key={category.href}>
                <Link
                  href={category.href}
                  aria-current={active ? "page" : undefined}
                  className={`${styles.link} ${active ? styles.linkActive : ""}`}
                >
                  {category.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className={styles.account}>
          {userEmail ? (
            <form action={signOut} className={styles.accountForm}>
              <span className={styles.email} title={userEmail}>
                {userEmail}
              </span>
              <button type="submit" className={styles.accountButton}>
                Se déconnecter
              </button>
            </form>
          ) : AUTH_PATHS.some((path) => pathname.startsWith(path)) ? null : (
            <Link
              href={`/connexion?next=${encodeURIComponent(pathname)}`}
              className={styles.accountButton}
            >
              Se connecter
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
