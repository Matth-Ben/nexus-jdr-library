"use client";

import {
  ABILITY_CODES,
  ABILITY_NAMES,
  CLASS_DESCRIPTION_MAX,
  FEATURE_DESCRIPTION_MAX,
  FEATURE_NAME_MAX,
  FEATURES_MAX,
  HIT_DICE,
  LEVEL_MAX,
  LEVEL_MIN,
  PROFICIENCIES_MAX,
  SKILL_COUNT_MAX,
  SKILLS,
  SUBCLASS_DESCRIPTION_MAX,
  SUBCLASS_NAME_MAX,
  SUBCLASSES_MAX,
} from "@/lib/proposals/payload-race-class";
import styles from "../propositions.module.css";
import { Field } from "./Field";
import { RepeatableRows } from "./RepeatableRows";

interface ClassFieldsProps {
  /** Valeurs saisies avant la dernière erreur (vide au premier affichage). */
  values: Record<string, string>;
  errors: Record<string, string>;
}

function AbilityChecks({
  base,
  legend,
  values,
  error,
}: {
  base: string;
  legend: string;
  values: Record<string, string>;
  error?: string;
}) {
  const errorId = `proposal-${base}-error`;
  return (
    <fieldset className={styles.checks} aria-describedby={error ? errorId : undefined}>
      <legend>{legend}</legend>
      {ABILITY_CODES.map((code) => (
        <label key={code} className={styles.check}>
          <input type="checkbox" name={`${base}.${code}`} defaultChecked={Boolean(values[`${base}.${code}`])} />{" "}
          {ABILITY_NAMES[code]}
        </label>
      ))}
      {error ? (
        <span id={errorId} role="alert" className={styles.inlineError}>
          {error}
        </span>
      ) : null}
    </fieldset>
  );
}

export function ClassFields({ values, errors }: ClassFieldsProps) {
  const proficiencyHint = `Une valeur par ligne, ${PROFICIENCIES_MAX} au maximum.`;
  return (
    <>
      <Field
        name="description"
        label="Description"
        error={errors.description}
        hint={`${CLASS_DESCRIPTION_MAX} caractères maximum.`}
      >
        {(props) => (
          <textarea {...props} name="description" defaultValue={values.description ?? ""} maxLength={CLASS_DESCRIPTION_MAX} />
        )}
      </Field>

      <Field name="hit_die" label="Dé de vie" error={errors.hit_die}>
        {(props) => (
          <select {...props} name="hit_die" defaultValue={values.hit_die ?? "8"}>
            {HIT_DICE.map((die) => (
              <option key={die} value={die}>
                d{die}
              </option>
            ))}
          </select>
        )}
      </Field>

      <AbilityChecks
        base="primary_abilities"
        legend="Caractéristiques principales (une ou deux)"
        values={values}
        error={errors.primary_abilities}
      />
      <AbilityChecks
        base="saving_throw_proficiencies"
        legend="Jets de sauvegarde maîtrisés (exactement deux)"
        values={values}
        error={errors.saving_throw_proficiencies}
      />

      <Field name="armor_proficiencies" label="Maîtrises d'armures" error={errors.armor_proficiencies} hint={proficiencyHint}>
        {(props) => (
          <textarea {...props} name="armor_proficiencies" defaultValue={values.armor_proficiencies ?? ""} rows={3} />
        )}
      </Field>
      <Field name="weapon_proficiencies" label="Maîtrises d'armes" error={errors.weapon_proficiencies} hint={proficiencyHint}>
        {(props) => (
          <textarea {...props} name="weapon_proficiencies" defaultValue={values.weapon_proficiencies ?? ""} rows={3} />
        )}
      </Field>
      <Field name="tool_proficiencies" label="Maîtrises d'outils" error={errors.tool_proficiencies} hint={proficiencyHint}>
        {(props) => (
          <textarea {...props} name="tool_proficiencies" defaultValue={values.tool_proficiencies ?? ""} rows={3} />
        )}
      </Field>

      <fieldset className={styles.checks} aria-describedby={errors.skill_choices ? "proposal-skill_choices-error" : undefined}>
        <legend>Choix de compétences</legend>
        <Field name="skill_count" label="Nombre de compétences à choisir" error={errors.skill_count}>
          {(props) => (
            <input
              {...props}
              name="skill_count"
              type="number"
              inputMode="numeric"
              step={1}
              min={0}
              max={SKILL_COUNT_MAX}
              defaultValue={values.skill_count ?? "2"}
            />
          )}
        </Field>
        <label className={styles.check}>
          <input type="checkbox" name="skill_all" defaultChecked={Boolean(values.skill_all)} /> Toutes les compétences
        </label>
        {SKILLS.map((skill) => (
          <label key={skill} className={styles.check}>
            <input type="checkbox" name={`skill.${skill}`} defaultChecked={Boolean(values[`skill.${skill}`])} /> {skill}
          </label>
        ))}
        {errors.skill_choices ? (
          <span id="proposal-skill_choices-error" role="alert" className={styles.inlineError}>
            {errors.skill_choices}
          </span>
        ) : null}
      </fieldset>

      <RepeatableRows
        name="features"
        valueName="features"
        errorName="features"
        values={values}
        errors={errors}
        legend="Aptitudes de classe (facultatif)"
        itemLabel="Aptitude"
        addLabel="Ajouter une aptitude"
        max={FEATURES_MAX}
      >
        {(row) => {
          const level = row.field("level");
          const name = row.field("name");
          const description = row.field("description");
          return (
            <>
              <div className={styles.fieldRow}>
                <Field name={name.name} label="Nom de l'aptitude" error={name.error}>
                  {(props) => (
                    <input {...props} name={name.name} type="text" defaultValue={name.defaultValue} maxLength={FEATURE_NAME_MAX} />
                  )}
                </Field>
                <Field name={level.name} label="Niveau d'obtention" error={level.error}>
                  {(props) => (
                    <input
                      {...props}
                      name={level.name}
                      type="number"
                      inputMode="numeric"
                      step={1}
                      min={LEVEL_MIN}
                      max={LEVEL_MAX}
                      defaultValue={level.defaultValue}
                    />
                  )}
                </Field>
              </div>
              <Field
                name={description.name}
                label="Description de l'aptitude"
                error={description.error}
                hint={`${FEATURE_DESCRIPTION_MAX} caractères maximum.`}
              >
                {(props) => (
                  <textarea
                    {...props}
                    name={description.name}
                    defaultValue={description.defaultValue}
                    maxLength={FEATURE_DESCRIPTION_MAX}
                  />
                )}
              </Field>
            </>
          );
        }}
      </RepeatableRows>

      <RepeatableRows
        name="subclasses"
        valueName="subclasses"
        errorName="subclasses"
        values={values}
        errors={errors}
        legend="Sous-classes (facultatif)"
        itemLabel="Sous-classe"
        addLabel="Ajouter une sous-classe"
        max={SUBCLASSES_MAX}
      >
        {(row) => {
          const level = row.field("available_from_level");
          const name = row.field("name");
          const description = row.field("description");
          return (
            <>
              <div className={styles.fieldRow}>
                <Field name={name.name} label="Nom de la sous-classe" error={name.error}>
                  {(props) => (
                    <input {...props} name={name.name} type="text" defaultValue={name.defaultValue} maxLength={SUBCLASS_NAME_MAX} />
                  )}
                </Field>
                <Field name={level.name} label="Niveau d'accès" error={level.error}>
                  {(props) => (
                    <input
                      {...props}
                      name={level.name}
                      type="number"
                      inputMode="numeric"
                      step={1}
                      min={LEVEL_MIN}
                      max={LEVEL_MAX}
                      defaultValue={level.defaultValue}
                    />
                  )}
                </Field>
              </div>
              <Field
                name={description.name}
                label="Description de la sous-classe"
                error={description.error}
                hint={`${SUBCLASS_DESCRIPTION_MAX} caractères maximum.`}
              >
                {(props) => (
                  <textarea
                    {...props}
                    name={description.name}
                    defaultValue={description.defaultValue}
                    maxLength={SUBCLASS_DESCRIPTION_MAX}
                  />
                )}
              </Field>
            </>
          );
        }}
      </RepeatableRows>
    </>
  );
}
