"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/(library)/connexion/actions";
import styles from "./CategoryNav.module.css";

interface NavLink {
  href: string;
  label: string;
}

interface Category extends NavLink {
  /** Pages dédiées rattachées à la catégorie, affichées en second niveau. */
  children?: NavLink[];
}

const CATEGORIES: Category[] = [
  { href: "/sorts", label: "Sorts" },
  {
    href: "/classes",
    label: "Classes",
    children: [
      { href: "/classes", label: "Classes" },
      { href: "/sous-classes", label: "Sous-classes" },
      { href: "/aptitudes", label: "Aptitudes" },
      { href: "/options-de-classe", label: "Options de classe" },
      { href: "/invocations", label: "Invocations" },
    ],
  },
  {
    href: "/races",
    label: "Races",
    children: [
      { href: "/races", label: "Races" },
      { href: "/sous-races", label: "Sous-races" },
      { href: "/lignees", label: "Lignées" },
    ],
  },
  { href: "/historiques", label: "Historiques" },
  { href: "/dons", label: "Dons" },
  { href: "/objets", label: "Objets" },
  { href: "/creatures", label: "Créatures" },
  { href: "/propositions", label: "Propositions" },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isCategoryActive(pathname: string, category: Category): boolean {
  return (category.children ?? [category]).some((link) => isActive(pathname, link.href));
}

interface CategoryNavProps {
  /** E-mail de l'utilisateur connecté, `null` pour un visiteur. */
  userEmail: string | null;
}

const AUTH_PATHS = ["/connexion", "/mot-de-passe-oublie", "/reinitialisation"];

export function CategoryNav({ userEmail }: CategoryNavProps) {
  const pathname = usePathname();
  const activeChildren = CATEGORIES.find((category) => isCategoryActive(pathname, category))
    ?.children;

  return (
    <header className={styles.header}>
      <nav className={styles.nav} aria-label="Catégories de la bibliothèque">
        <Link href="/" className={styles.brand}>
          Nexus JDR
        </Link>
        <ul className={styles.list}>
          {CATEGORIES.map((category) => {
            const active = isCategoryActive(pathname, category);
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
      {activeChildren ? (
        <nav className={styles.subnav} aria-label="Pages de la catégorie">
          <ul className={styles.list}>
            {activeChildren.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`${styles.sublink} ${active ? styles.sublinkActive : ""}`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
