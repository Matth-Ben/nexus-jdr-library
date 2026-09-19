import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.intro}>
          <h1>Nexus JDR — Bibliothèque</h1>
          <p>
            Bibliothèque communautaire de contenu D&amp;D 5e : sorts, classes, races, dons et
            objets, ouverte à la contribution.
          </p>
        </div>
        <div className={styles.ctas}>
          <Link className={styles.primary} href="/sorts">
            Sorts
          </Link>
          <Link className={styles.secondary} href="/classes">
            Classes
          </Link>
          <Link className={styles.secondary} href="/races">
            Races
          </Link>
          <Link className={styles.secondary} href="/dons">
            Dons
          </Link>
          <Link className={styles.secondary} href="/objets">
            Objets
          </Link>
          <Link className={styles.secondary} href="/propositions">
            Propositions
          </Link>
        </div>
      </main>
    </div>
  );
}
