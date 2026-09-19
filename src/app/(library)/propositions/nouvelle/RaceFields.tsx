"use client";

import {
  LANGUAGES_MAX,
  NAME_MAX,
  RACE_SIZES,
  SPEED_MAX,
  SPEED_MIN,
  SUBRACES_MAX,
} from "@/lib/proposals/payload-race-class";
import { AbilityBonusFields } from "./AbilityBonusFields";
import { Field } from "./Field";
import { RepeatableRows, type RowField } from "./RepeatableRows";
import { TraitRows } from "./TraitRows";

interface RaceFieldsProps {
  /** Valeurs saisies avant la dernière erreur (vide au premier affichage). */
  values: Record<string, string>;
  errors: Record<string, string>;
}

export function RaceFields({ values, errors }: RaceFieldsProps) {
  const top = (sub: string): RowField => ({ name: sub, defaultValue: values[sub] ?? "", error: errors[sub] });

  return (
    <>
      <Field name="size" label="Taille" error={errors.size}>
        {(props) => (
          <select {...props} name="size" defaultValue={values.size ?? "Moyenne"}>
            {RACE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field
        name="speed"
        label="Vitesse"
        error={errors.speed}
        hint="Même unité que la liste des races (par exemple 30)."
      >
        {(props) => (
          <input
            {...props}
            name="speed"
            type="number"
            inputMode="numeric"
            step={1}
            min={SPEED_MIN}
            max={SPEED_MAX}
            defaultValue={values.speed ?? "30"}
          />
        )}
      </Field>

      <AbilityBonusFields field={top} />

      <Field
        name="languages"
        label="Langues"
        error={errors.languages}
        hint={`Une langue par ligne, ${LANGUAGES_MAX} au maximum.`}
      >
        {(props) => <textarea {...props} name="languages" defaultValue={values.languages ?? ""} rows={3} />}
      </Field>

      <TraitRows name="traits" valueName="traits" errorName="traits" values={values} errors={errors} />

      <RepeatableRows
        name="subraces"
        valueName="subraces"
        errorName="subraces"
        values={values}
        errors={errors}
        legend="Sous-races (facultatif)"
        itemLabel="Sous-race"
        addLabel="Ajouter une sous-race"
        max={SUBRACES_MAX}
      >
        {(row) => {
          const subraceName = row.field("name");
          return (
            <>
              <Field name={subraceName.name} label="Nom de la sous-race" error={subraceName.error}>
                {(props) => (
                  <input
                    {...props}
                    name={subraceName.name}
                    type="text"
                    defaultValue={subraceName.defaultValue}
                    maxLength={NAME_MAX}
                  />
                )}
              </Field>
              <AbilityBonusFields field={row.field} />
              <TraitRows
                name={`${row.name}.traits`}
                valueName={row.valueName !== null ? `${row.valueName}.traits` : null}
                errorName={row.errorName !== null ? `${row.errorName}.traits` : null}
                values={values}
                errors={errors}
                subraceNumber={row.position + 1}
              />
            </>
          );
        }}
      </RepeatableRows>
    </>
  );
}
