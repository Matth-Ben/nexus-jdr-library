"use client";

import { useActionState } from "react";
import { formatCategory } from "@/lib/items/translations";
import {
  CURRENCIES,
  DESCRIPTION_MAX,
  ITEM_CATEGORIES,
  PREREQUISITE_MAX,
  RARITIES,
  RARITY_LABELS,
  SHORT_TEXT_MAX,
  SPELL_SCHOOLS,
  TITLE_MAX,
} from "@/lib/proposals/payload";
import { NAME_MAX } from "@/lib/proposals/payload-race-class";
import { TYPE_LABELS } from "@/lib/proposals/format";
import type { ProposalType } from "@/lib/proposals/types";
import { createProposal, type ProposalFormState } from "../actions";
import styles from "../propositions.module.css";
import { ClassFields } from "./ClassFields";
import { Field } from "./Field";
import { RaceFields } from "./RaceFields";

const INITIAL_STATE: ProposalFormState = {};

interface NewProposalFormProps {
  type: ProposalType;
  /** Élément existant à modifier (`target_id`) : le formulaire s'ouvre prérempli avec ses valeurs. */
  target?: { id: number; initialValues: Record<string, string> };
}

export function NewProposalForm({ type, target }: NewProposalFormProps) {
  const [state, formAction, pending] = useActionState(createProposal, INITIAL_STATE);
  const errors = state.errors ?? {};
  const values = state.values ?? {};
  const modification = target !== undefined;
  // Les valeurs conservées ne valent que pour le type soumis ; sans soumission, celles de l'existant.
  const kept = values.content_type === type ? values : (target?.initialValues ?? {});
  const checked = (name: string) => kept[name] !== undefined && kept[name] !== "";
  const isRaceOrClass = type === "race" || type === "class";
  const errorKeys = Object.keys(errors).filter((key) => key !== "_form");
  const currentSchool = target?.initialValues.school ?? "";
  const schoolOptions: string[] = [...SPELL_SCHOOLS];
  if (modification && currentSchool !== "" && !schoolOptions.includes(currentSchool)) {
    schoolOptions.push(currentSchool);
  }

  return (
    <form action={formAction} className={styles.form} noValidate>
      <input type="hidden" name="content_type" value={type} />
      {target ? <input type="hidden" name="target_id" value={target.id} /> : null}

      {errors._form ? (
        <p role="alert" className={styles.error}>
          {errors._form}
        </p>
      ) : errorKeys.length > 0 ? (
        <p role="alert" className={styles.error}>
          {errorKeys.length > 1
            ? "Quelques champs sont à corriger, ils sont signalés ci-dessous."
            : "Un champ est à corriger, il est signalé ci-dessous."}
        </p>
      ) : null}

      <Field
        name="title"
        label={isRaceOrClass ? `Nom de la ${TYPE_LABELS[type].toLowerCase()}` : `Titre (${TYPE_LABELS[type].toLowerCase()})`}
        error={errors.title}
      >
        {(props) => (
          <input
            {...props}
            name="title"
            type="text"
            defaultValue={kept.title ?? ""}
            maxLength={isRaceOrClass ? NAME_MAX : TITLE_MAX}
          />
        )}
      </Field>

      {type === "race" ? (
        <RaceFields key={state.nonce} values={kept} errors={errors} modification={modification} />
      ) : null}
      {type === "class" ? (
        <ClassFields key={state.nonce} values={kept} errors={errors} modification={modification} />
      ) : null}

      {type === "spell" ? (
        <>
          <div className={styles.fieldRow}>
            <Field name="level" label="Niveau" error={errors.level}>
              {(props) => (
                <select {...props} name="level" defaultValue={kept.level ?? "1"}>
                  <option value="0">Tour de magie</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
                    <option key={level} value={level}>
                      Niveau {level}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field name="school" label="École" error={errors.school}>
              {(props) => (
                <select {...props} name="school" defaultValue={kept.school ?? SPELL_SCHOOLS[0]}>
                  {/* Modification : l'école peut manquer en base, ou venir d'un ancien vocabulaire (« Invocation »). */}
                  {modification ? <option value="">Non précisée</option> : null}
                  {schoolOptions.map((school) => (
                    <option key={school} value={school}>
                      {school}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
          <div className={styles.fieldRow}>
            <Field name="casting_time" label="Temps d'incantation" error={errors.casting_time}>
              {(props) => (
                <input
                  {...props}
                  name="casting_time"
                  type="text"
                  defaultValue={kept.casting_time ?? ""}
                  maxLength={SHORT_TEXT_MAX}
                  placeholder="1 action"
                />
              )}
            </Field>
            <Field name="range" label="Portée" error={errors.range}>
              {(props) => (
                <input
                  {...props}
                  name="range"
                  type="text"
                  defaultValue={kept.range ?? ""}
                  maxLength={SHORT_TEXT_MAX}
                  placeholder="18 mètres"
                />
              )}
            </Field>
          </div>
          <Field name="duration" label="Durée" error={errors.duration}>
            {(props) => (
              <input
                {...props}
                name="duration"
                type="text"
                defaultValue={kept.duration ?? ""}
                maxLength={SHORT_TEXT_MAX}
                placeholder="Instantanée"
              />
            )}
          </Field>
          <fieldset className={styles.checks} aria-describedby={errors.components ? "proposal-components-error" : undefined}>
            <legend>Composantes</legend>
            <label className={styles.check}>
              <input type="checkbox" name="component_verbal" defaultChecked={checked("component_verbal")} /> Verbale (V)
            </label>
            <label className={styles.check}>
              <input type="checkbox" name="component_somatic" defaultChecked={checked("component_somatic")} /> Somatique
              (S)
            </label>
            <label className={styles.check}>
              <input type="checkbox" name="component_material" defaultChecked={checked("component_material")} />{" "}
              Matérielle (M)
            </label>
            {errors.components ? (
              <span id="proposal-components-error" role="alert" className={styles.inlineError}>
                {errors.components}
              </span>
            ) : null}
          </fieldset>
          <div className={styles.checks}>
            <label className={styles.check}>
              <input type="checkbox" name="concentration" defaultChecked={checked("concentration")} /> Concentration
            </label>
            <label className={styles.check}>
              <input type="checkbox" name="ritual" defaultChecked={checked("ritual")} /> Rituel
            </label>
          </div>
        </>
      ) : null}

      {type === "feat" ? (
        <Field
          name="prerequisite"
          label="Prérequis (optionnel)"
          error={errors.prerequisite}
          hint="Par exemple « Force 13 ou plus »."
        >
          {(props) => (
            <input {...props} name="prerequisite" type="text" defaultValue={kept.prerequisite ?? ""} maxLength={PREREQUISITE_MAX} />
          )}
        </Field>
      ) : null}

      {type === "item" ? (
        <>
          <div className={styles.fieldRow}>
            <Field name="category" label="Catégorie" error={errors.category}>
              {(props) => (
                <select {...props} name="category" defaultValue={kept.category ?? ITEM_CATEGORIES[0]}>
                  {ITEM_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {formatCategory(category)}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field name="rarity" label="Rareté (optionnelle)" error={errors.rarity}>
              {(props) => (
                <select {...props} name="rarity" defaultValue={kept.rarity ?? ""}>
                  <option value="">Non précisée</option>
                  {RARITIES.map((rarity) => (
                    <option key={rarity} value={rarity}>
                      {RARITY_LABELS[rarity]}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
          <div className={styles.fieldRow}>
            <Field name="cost_amount" label="Coût (optionnel)" error={errors.cost_amount}>
              {(props) => (
                <input {...props} name="cost_amount" type="text" inputMode="decimal" defaultValue={kept.cost_amount ?? ""} />
              )}
            </Field>
            <Field name="cost_currency" label="Devise" error={errors.cost_currency}>
              {(props) => (
                <select {...props} name="cost_currency" defaultValue={kept.cost_currency ?? "po"}>
                  {CURRENCIES.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
          <Field name="weight" label="Poids en kg (optionnel)" error={errors.weight}>
            {(props) => <input {...props} name="weight" type="text" inputMode="decimal" defaultValue={kept.weight ?? ""} />}
          </Field>
          <div className={styles.checks}>
            <label className={styles.check}>
              <input
                type="checkbox"
                name="requires_attunement"
                defaultChecked={checked("requires_attunement")}
              />{" "}
              Nécessite un lien
            </label>
            <label className={styles.check}>
              <input type="checkbox" name="consumable" defaultChecked={checked("consumable")} /> Consommable
            </label>
          </div>
        </>
      ) : null}

      {!isRaceOrClass ? (
        <Field
          name="description"
          label={modification && type === "item" ? "Description (optionnelle)" : "Description"}
          error={errors.description}
          hint={`${DESCRIPTION_MAX} caractères maximum.`}
        >
          {(props) => (
            <textarea {...props} name="description" defaultValue={kept.description ?? ""} maxLength={DESCRIPTION_MAX} />
          )}
        </Field>
      ) : null}

      <p className={styles.notice}>
        Propose uniquement du contenu original (homebrew) : pas de recopie de contenu protégé au-delà du SRD. Ta
        proposition sera visible publiquement, ouverte aux commentaires et aux votes, puis examinée par
        l&apos;administrateur.
      </p>

      <div className={styles.actions}>
        <button type="submit" className={styles.button} disabled={pending}>
          {pending ? "Envoi…" : "Envoyer ma proposition"}
        </button>
      </div>
    </form>
  );
}
