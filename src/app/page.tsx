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
            Parcourir les sorts
          </Link>
        </div>
      </main>
    </div>
  );
}
