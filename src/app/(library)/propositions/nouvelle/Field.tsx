import type { ReactNode } from "react";
import styles from "../propositions.module.css";

interface FieldProps {
  name: string;
  label: string;
  error?: string;
  hint?: string;
  children: (props: { id: string; "aria-invalid"?: true; "aria-describedby"?: string }) => ReactNode;
}

/** Libellé + champ + aide + erreur associés par `htmlFor` / `aria-describedby`. */
export function Field({ name, label, error, hint, children }: FieldProps) {
  const id = `proposal-${name}`;
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ");
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy || undefined,
      })}
      {hint ? (
        <span id={`${id}-hint`} className={styles.hint}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={`${id}-error`} role="alert" className={styles.inlineError}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
