"use client";

import {
  SUBRACE_TRAITS_MAX,
  TRAIT_DESCRIPTION_MAX,
  TRAIT_NAME_MAX,
  TRAITS_MAX,
} from "@/lib/proposals/payload-race-class";
import { Field } from "./Field";
import { RepeatableRows } from "./RepeatableRows";

interface TraitRowsProps {
  name: string;
  valueName: string | null;
  errorName: string | null;
  values: Record<string, string>;
  errors: Record<string, string>;
  /** Numéro (à partir de 1) de la sous-race propriétaire ; absent pour les traits de la race. Traits facultatifs, moins nombreux. */
  subraceNumber?: number;
}

/** Lignes « nom + description » des traits d'une race ou d'une sous-race. */
export function TraitRows({ name, valueName, errorName, values, errors, subraceNumber }: TraitRowsProps) {
  const subrace = subraceNumber !== undefined;
  // Les libellés portent le numéro de la sous-race : sans lui, les boutons des différentes listes seraient indiscernables.
  const of = subrace ? ` de la sous-race ${subraceNumber}` : "";
  return (
    <RepeatableRows
      name={name}
      valueName={valueName}
      errorName={errorName}
      values={values}
      errors={errors}
      legend={subrace ? `Traits de la sous-race ${subraceNumber} (facultatif)` : "Traits"}
      itemLabel="Trait"
      itemContext={of}
      addLabel={`Ajouter un trait${of}`}
      min={subrace ? 0 : 1}
      max={subrace ? SUBRACE_TRAITS_MAX : TRAITS_MAX}
      hint={subrace ? undefined : "Au moins un trait : ils tiennent lieu de description de la race."}
    >
      {(row) => {
        const traitName = row.field("name");
        const traitDescription = row.field("description");
        return (
          <>
            <Field name={traitName.name} label="Nom du trait" error={traitName.error}>
              {(props) => (
                <input
                  {...props}
                  name={traitName.name}
                  type="text"
                  defaultValue={traitName.defaultValue}
                  maxLength={TRAIT_NAME_MAX}
                />
              )}
            </Field>
            <Field
              name={traitDescription.name}
              label="Description du trait"
              error={traitDescription.error}
              hint={`${TRAIT_DESCRIPTION_MAX} caractères maximum.`}
            >
              {(props) => (
                <textarea
                  {...props}
                  name={traitDescription.name}
                  defaultValue={traitDescription.defaultValue}
                  maxLength={TRAIT_DESCRIPTION_MAX}
                />
              )}
            </Field>
          </>
        );
      }}
    </RepeatableRows>
  );
}
