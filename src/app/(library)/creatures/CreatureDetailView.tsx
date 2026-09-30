import styles from "@/components/reference/reference.module.css";
import type { CreatureBlock, CreatureDetail } from "@/lib/creatures/types";
import local from "./creatures.module.css";

function BlockSection({ title, blocks }: { title: string; blocks: readonly CreatureBlock[] }) {
  if (blocks.length === 0) {
    return null;
  }
  return (
    <section className={styles.section}>
      <h2>{title}</h2>
      <dl className={styles.traitList}>
        {blocks.map((block, index) => (
          <div key={`${block.name}-${index}`} className={styles.trait}>
            <dt>{block.name}</dt>
            <dd>{block.description}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Ligne facultative de la grille de statistiques. */
function Stat({ label, value }: { label: string; value: string | null }) {
  if (!value) {
    return null;
  }
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/** Fiche d'une créature, affichée dans le panneau de `/creatures`. */
export function CreatureDetailView({ creature }: { creature: CreatureDetail }) {
  return (
    <div className={styles.detail}>
      <div>
        <h1>{creature.name}</h1>
        <p className={local.subtitle}>
          {[`${creature.type} de taille ${creature.size.toLowerCase()}`, creature.alignment]
            .filter(Boolean)
            .join(", ")}
        </p>
      </div>

      <dl className={styles.detailGrid}>
        <Stat label="Classe d'armure" value={creature.armorClass} />
        <Stat label="Points de vie" value={creature.hitPoints} />
        <Stat label="Vitesse" value={creature.speed} />
        <Stat label="Initiative" value={creature.initiative} />
      </dl>

      <div className={local.abilities} aria-label="Caractéristiques">
        {creature.abilities.map((ability) => (
          <div key={ability.code} className={local.ability}>
            <span className={local.abilityLabel}>{ability.label}</span>
            <span className={local.abilityScore}>{ability.score}</span>
            <span className={local.abilityMeta}>
              mod {ability.modifier} · JS {ability.save}
            </span>
          </div>
        ))}
      </div>

      <dl className={styles.detailGrid}>
        <Stat label="Compétences" value={creature.skills} />
        <Stat label="Vulnérabilités" value={creature.vulnerabilities} />
        <Stat label="Résistances" value={creature.resistances} />
        <Stat label="Immunités (dégâts)" value={creature.immunities} />
        <Stat label="Immunités (états)" value={creature.conditionImmunities} />
        <Stat label="Sens" value={creature.senses} />
        <Stat label="Langues" value={creature.languages ?? "—"} />
        <Stat label="Facteur de puissance" value={creature.challengeLabel} />
      </dl>

      <BlockSection title="Traits" blocks={creature.traits} />
      <BlockSection title="Actions" blocks={creature.actions} />
      <BlockSection title="Actions bonus" blocks={creature.bonusActions} />
      <BlockSection title="Réactions" blocks={creature.reactions} />
      <BlockSection title="Actions légendaires" blocks={creature.legendaryActions} />

      {creature.source ? (
        <p className={local.source}>
          Source : {creature.source} — System Reference Document 5.2, Wizards of the Coast LLC,
          licence CC-BY-4.0.
        </p>
      ) : null}
    </div>
  );
}
