import type { ListChange, ProposalDiff } from "@/lib/proposals/diff";
import styles from "./propositions.module.css";

/** Un texte long modifié est résumé ; l'ancienne et la nouvelle version sont dans un bloc replié. */
const INLINE_MAX = 120;

function ListSummary({ change }: { change: ListChange }) {
  const parts: { key: string; text: string }[] = [];
  if (change.added.length > 0) parts.push({ key: "added", text: `ajouté${change.added.length > 1 ? "s" : ""} : ${change.added.join(", ")}` });
  if (change.removed.length > 0) parts.push({ key: "removed", text: `retiré${change.removed.length > 1 ? "s" : ""} : ${change.removed.join(", ")}` });
  if (change.changed.length > 0) parts.push({ key: "changed", text: `modifié${change.changed.length > 1 ? "s" : ""} : ${change.changed.join(", ")}` });
  return (
    <li>
      <span className={styles.changeLabel}>{change.label}</span> — {parts.map((part) => part.text).join(" ; ")}
    </li>
  );
}

/**
 * « Ce qui change » : aide les votants et l'admin à décider. Champs simples en
 * « avant → après », listes par éléments ajoutés / retirés / modifiés (par nom).
 */
export function ProposalChanges({ diff }: { diff: ProposalDiff }) {
  return (
    <section className={styles.changes} aria-label="Ce qui change">
      <h2>Ce qui change</h2>
      {!diff.hasChanges ? (
        <p className={styles.hint}>
          Aucune différence avec la version actuelle : l&apos;élément a peut-être déjà été modifié depuis cette
          proposition.
        </p>
      ) : (
        <ul className={styles.changeList}>
          {diff.scalars.map((change) => (
            <li key={change.label}>
              <span className={styles.changeLabel}>{change.label}</span> :{" "}
              <span className={styles.changeBefore}>{change.before || "(vide)"}</span> → {change.after || "(vide)"}
            </li>
          ))}
          {diff.texts.map((change) => {
            const short = change.before.length <= INLINE_MAX && change.after.length <= INLINE_MAX;
            return (
              <li key={change.label} className={styles.changeText}>
                <span className={styles.changeLabel}>{change.label}</span> :{" "}
                {short ? (
                  <>
                    <span className={styles.changeBefore}>{change.before || "(vide)"}</span> → {change.after || "(vide)"}
                  </>
                ) : (
                  "modifiée"
                )}
                {!short ? (
                  <details>
                    <summary>Voir l&apos;ancienne et la nouvelle version</summary>
                    <p>
                      <strong>Avant :</strong> {change.before || "(vide)"}
                    </p>
                    <p>
                      <strong>Après :</strong> {change.after || "(vide)"}
                    </p>
                  </details>
                ) : null}
              </li>
            );
          })}
          {diff.lists.map((change) => (
            <ListSummary key={change.label} change={change} />
          ))}
        </ul>
      )}
    </section>
  );
}
