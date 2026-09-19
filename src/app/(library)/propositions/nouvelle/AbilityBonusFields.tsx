"use client";

import {
  ABILITY_BONUS_MAX,
  ABILITY_BONUS_MIN,
  ABILITY_CODES,
  ABILITY_NAMES,
  CHOICE_AMOUNT_MAX,
  CHOICE_COUNT_MAX,
} from "@/lib/proposals/payload-race-class";
import styles from "../propositions.module.css";
import { Field } from "./Field";
import type { RowField } from "./RepeatableRows";

/**
 * Bonus de caractéristiques d'une race ou d'une sous-race : six entiers
 * (vides ou 0 = pas de bonus) + « N caractéristiques au choix, bonus de X ».
 * `field("ability.str")`, `field("choice_count")`, `field("choice_amount")`
 * fournissent nom, valeur et erreur (préfixe propre à la race ou à la sous-race).
 */
export function AbilityBonusFields({ field }: { field: (sub: string) => RowField }) {
  const choiceCount = field("choice_count");
  const choiceAmount = field("choice_amount");
  return (
    <fieldset className={styles.checks}>
      <legend>Bonus de caractéristiques</legend>
      <div className={styles.abilityGrid}>
        {ABILITY_CODES.map((code) => {
          const bonus = field(`ability.${code}`);
          return (
            <Field key={code} name={bonus.name} label={ABILITY_NAMES[code]} error={bonus.error}>
              {(props) => (
                <input
                  {...props}
                  name={bonus.name}
                  type="number"
                  inputMode="numeric"
                  step={1}
                  min={ABILITY_BONUS_MIN}
                  max={ABILITY_BONUS_MAX}
                  defaultValue={bonus.defaultValue}
                />
              )}
            </Field>
          );
        })}
      </div>
      <div className={styles.fieldRow}>
        <Field name={choiceCount.name} label="Caractéristiques au choix (nombre)" error={choiceCount.error}>
          {(props) => (
            <input
              {...props}
              name={choiceCount.name}
              type="number"
              inputMode="numeric"
              step={1}
              min={1}
              max={CHOICE_COUNT_MAX}
              defaultValue={choiceCount.defaultValue}
            />
          )}
        </Field>
        <Field name={choiceAmount.name} label="Caractéristiques au choix (bonus)" error={choiceAmount.error}>
          {(props) => (
            <input
              {...props}
              name={choiceAmount.name}
              type="number"
              inputMode="numeric"
              step={1}
              min={1}
              max={CHOICE_AMOUNT_MAX}
              defaultValue={choiceAmount.defaultValue}
            />
          )}
        </Field>
      </div>
    </fieldset>
  );
}
