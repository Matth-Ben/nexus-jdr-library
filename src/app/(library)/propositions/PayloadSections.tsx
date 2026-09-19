import type { ReactNode } from "react";
import type { PayloadItem, PayloadSection } from "@/lib/proposals/payload-view";
import styles from "./propositions.module.css";

/**
 * Listes détaillées d'un payload (traits, sous-races, aptitudes par niveau,
 * sous-classes). Tout le texte est du texte React (échappé) : jamais de HTML injecté.
 */

type Level = 2 | 3 | 4 | 5;

function Heading({ level, children, className }: { level: Level; children: ReactNode; className?: string }) {
  const Tag = `h${level}` as const;
  return <Tag className={className}>{children}</Tag>;
}

const deeper = (level: Level): Level => Math.min(level + 1, 5) as Level;

function ItemTitle({ item }: { item: PayloadItem }) {
  return (
    <>
      {item.title}
      {item.note ? <span className={styles.itemNote}> — {item.note}</span> : null}
    </>
  );
}

function ItemBody({ item, level }: { item: PayloadItem; level: Level }) {
  return (
    <>
      {item.text ? <p className={styles.description}>{item.text}</p> : null}
      {item.rows && item.rows.length > 0 ? (
        <dl className={styles.itemRows}>
          {item.rows.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {item.sections?.map((section) => (
        <PayloadSectionView key={section.title} section={section} level={level} />
      ))}
    </>
  );
}

function PayloadSectionView({ section, level }: { section: PayloadSection; level: Level }) {
  return (
    <section className={styles.payloadSection}>
      <Heading level={level}>{section.title}</Heading>
      <ul className={styles.payloadItems}>
        {section.items.map((item, index) => {
          const showGroup = item.group !== undefined && item.group !== section.items[index - 1]?.group;
          const titleLevel = item.group !== undefined ? deeper(deeper(level)) : deeper(level);
          return (
            <li key={index} className={styles.payloadItem}>
              {showGroup ? <Heading level={deeper(level)} className={styles.payloadGroup}>
                  {item.group}
                </Heading> : null}
              {section.collapsible ? (
                <details>
                  <summary>
                    <strong>
                      <ItemTitle item={item} />
                    </strong>
                  </summary>
                  <ItemBody item={item} level={deeper(level)} />
                </details>
              ) : (
                <>
                  <Heading level={titleLevel}>
                    <ItemTitle item={item} />
                  </Heading>
                  <ItemBody item={item} level={deeper(titleLevel)} />
                </>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function PayloadSections({ sections }: { sections: PayloadSection[] }) {
  return (
    <>
      {sections.map((section) => (
        <PayloadSectionView key={section.title} section={section} level={2} />
      ))}
    </>
  );
}
