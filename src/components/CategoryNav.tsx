"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./CategoryNav.module.css";

const CATEGORIES = [
  { href: "/sorts", label: "Sorts" },
  { href: "/classes", label: "Classes" },
  { href: "/races", label: "Races" },
  { href: "/dons", label: "Dons" },
  { href: "/objets", label: "Objets" },
] as const;

export function CategoryNav() {
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
      </nav>
    </header>
  );
}
