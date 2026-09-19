"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import styles from "./DetailPanel.module.css";

interface DetailPanelProps {
  /** URL de la liste sans `?open=` : cible du bouton, du fond et de la touche Échap. */
  closeHref: string;
  /** Change quand un autre élément est ouvert : remet le panneau en haut. */
  resetKey: number;
  children: ReactNode;
}

export function DetailPanel({ closeHref, resetKey, children }: DetailPanelProps) {
  const router = useRouter();
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        router.push(closeHref, { scroll: false });
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeHref, router]);

  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0 });
  }, [resetKey]);

  return (
    <div className={styles.overlay}>
      <Link href={closeHref} scroll={false} className={styles.backdrop} aria-label="Fermer le panneau" tabIndex={-1} />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Détail de la fiche"
        tabIndex={-1}
        className={styles.panel}
      >
        <Link href={closeHref} scroll={false} className={styles.close}>
          Fermer ✕
        </Link>
        {children}
      </aside>
    </div>
  );
}
