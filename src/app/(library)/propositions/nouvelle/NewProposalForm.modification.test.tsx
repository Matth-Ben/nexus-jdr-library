import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildClassContent,
  buildItemContent,
  buildRaceContent,
  buildSpellContent,
  existingFormValues,
  type ExistingContent,
} from "@/lib/proposals/existing";
import { NewProposalForm } from "./NewProposalForm";

const { createProposal } = vi.hoisted(() => ({ createProposal: vi.fn() }));
vi.mock("../actions", () => ({ createProposal }));

beforeEach(() => {
  createProposal.mockReset();
});

function renderFor(existing: ExistingContent) {
  return render(
    <NewProposalForm
      type={existing.type}
      target={{ id: existing.id, initialValues: existingFormValues(existing) }}
    />,
  );
}

const field = (container: HTMLElement, name: string) => container.querySelector<HTMLInputElement>(`[name="${name}"]`);

describe("NewProposalForm — modification (préremplissage)", () => {
  it("transmet la cible dans un champ caché, sans jamais l'exposer en mode nouveau contenu", () => {
    const spell = buildSpellContent(
      7,
      {
        level: 3,
        school: "Évocation",
        casting_time: "1 action",
        range: "45 mètres",
        duration: "Instantanée",
        components: { verbal: true, somatic: true, material: false },
        concentration: true,
        ritual: false,
      },
      { name: "Boule de feu", description: "Une explosion." },
    );
    const { container, unmount } = renderFor(spell);
    expect(field(container, "target_id")).toHaveValue("7");
    expect(field(container, "target_id")).toHaveAttribute("type", "hidden");
    unmount();

    const fresh = render(<NewProposalForm type="spell" />);
    expect(field(fresh.container, "target_id")).toBeNull();
    expect(screen.queryByRole("option", { name: "Non précisée" })).not.toBeInTheDocument();
  });

  it("sort : toutes les valeurs de l'existant, titre = nom actuel", () => {
    const spell = buildSpellContent(
      7,
      {
        level: 3,
        school: "Évocation",
        casting_time: "1 action",
        range: "45 mètres",
        duration: "Instantanée",
        components: { verbal: true, somatic: true, material: false },
        concentration: true,
        ritual: false,
      },
      { name: "Boule de feu", description: "Une explosion." },
    );
    renderFor(spell);
    expect(screen.getByLabelText("Titre (sort)")).toHaveValue("Boule de feu");
    expect(screen.getByLabelText("Niveau")).toHaveValue("3");
    expect(screen.getByLabelText("École")).toHaveValue("Évocation");
    expect(screen.getByLabelText("Temps d'incantation")).toHaveValue("1 action");
    expect(screen.getByLabelText("Portée")).toHaveValue("45 mètres");
    expect(screen.getByLabelText("Durée")).toHaveValue("Instantanée");
    expect(screen.getByLabelText(/Verbale/)).toBeChecked();
    expect(screen.getByLabelText(/Somatique/)).toBeChecked();
    expect(screen.getByLabelText(/Matérielle/)).not.toBeChecked();
    expect(screen.getByLabelText(/Concentration/)).toBeChecked();
    expect(screen.getByLabelText(/Rituel/)).not.toBeChecked();
    expect(screen.getByLabelText("Description")).toHaveValue("Une explosion.");
  });

  it("sort : école nulle → « Non précisée » ; école héritée (Invocation) → option supplémentaire", () => {
    const base = {
      level: 1,
      casting_time: "1 action",
      range: "Contact",
      duration: "Instantanée",
      components: {},
      concentration: false,
      ritual: false,
    };
    const nullSchool = renderFor(buildSpellContent(1, { ...base, school: null }, { name: "A", description: "B" }));
    expect(screen.getByLabelText("École")).toHaveValue("");
    expect(screen.getByRole("option", { name: "Non précisée" })).toBeInTheDocument();
    nullSchool.unmount();

    renderFor(buildSpellContent(2, { ...base, school: "Invocation" }, { name: "C", description: "D" }));
    expect(screen.getByLabelText("École")).toHaveValue("Invocation");
    expect(screen.getByRole("option", { name: "Invocation" })).toBeInTheDocument();
  });

  it("objet : coût converti, description facultative", () => {
    renderFor(
      buildItemContent(
        1,
        {
          category: "arme",
          weight: 1.5,
          cost: { amount: 0.5, currency: "gp" },
          rarity: null,
          requires_attunement: false,
          consumable: true,
        },
        { name: "Dague" },
      ),
    );
    expect(screen.getByLabelText("Titre (objet)")).toHaveValue("Dague");
    expect(screen.getByLabelText("Catégorie")).toHaveValue("arme");
    expect(screen.getByLabelText("Coût (optionnel)")).toHaveValue("5");
    expect(screen.getByLabelText("Devise")).toHaveValue("pa");
    expect(screen.getByLabelText("Poids en kg (optionnel)")).toHaveValue("1.5");
    expect(screen.getByLabelText(/Consommable/)).toBeChecked();
    expect(screen.getByLabelText("Description (optionnelle)")).toHaveValue("");
  });

  it("race : lignes répétables (traits, sous-races et leurs traits) et bonus préremplis", () => {
    const race = buildRaceContent(
      2,
      {
        size: "Moyenne",
        speed: 9,
        ability_bonuses: { dex: 2, choice_others: { count: 2, amount: 1 } },
        languages: ["Commun", "Elfique"],
        traits: [
          { name: "Vision", description: "Tu vois." },
          { name: "Transe", description: "Tu médites." },
        ],
      },
      [{ id: 1, name: "Haut-elfe", ability_bonuses: { int: 1 }, traits: [{ name: "Sort mineur", description: "Un tour." }] }],
      { name: "Elfe" },
    );
    const { container } = renderFor(race);
    expect(screen.getByLabelText("Nom de la race")).toHaveValue("Elfe");
    expect(screen.getByLabelText("Taille")).toHaveValue("Moyenne");
    expect(screen.getByLabelText("Vitesse")).toHaveValue(9);
    expect(screen.getByLabelText("Langues")).toHaveValue("Commun\nElfique");
    expect(field(container, "ability.dex")).toHaveValue(2);
    expect(field(container, "choice_count")).toHaveValue(2);
    expect(field(container, "traits.0.name")).toHaveValue("Vision");
    expect(field(container, "traits.1.name")).toHaveValue("Transe");
    expect(field(container, "traits.1.description")).toHaveValue("Tu médites.");
    expect(field(container, "traits.2.name")).toBeNull();
    expect(field(container, "subraces.0.name")).toHaveValue("Haut-elfe");
    expect(field(container, "subraces.0.ability.int")).toHaveValue(1);
    expect(field(container, "subraces.0.traits.0.name")).toHaveValue("Sort mineur");
  });

  it("race sans trait : le seul trait affiché peut être retiré", () => {
    const race = buildRaceContent(
      11,
      { size: "Moyenne", speed: 9, ability_bonuses: {}, languages: [], traits: [] },
      [],
      { name: "Nue" },
    );
    renderFor(race);
    expect(screen.getByText("Les traits tiennent lieu de description de la race.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Supprimer trait 1", hidden: true })).toBeEnabled();
  });

  it("classe : cases, listes de maîtrises, aptitudes et sous-classes préremplies", () => {
    const klass = buildClassContent(
      9,
      {
        hit_die: 8,
        primary_abilities: ["dex"],
        saving_throw_proficiencies: ["dex", "int"],
        armor_proficiencies: ["armures légères"],
        weapon_proficiencies: ["armes courantes"],
        tool_proficiencies: { type: "instrument", count: 3 },
        skill_choices: { count: 2, choices: ["Acrobaties", "Discrétion"] },
      },
      [
        { id: 1, level: 1, name: "Attaque sournoise", description: "Des dégâts." },
        { id: 2, level: 2, name: "Ruse", description: "Une ruse." },
      ],
      [{ id: 1, available_from_level: 3, name: "Voleur", description: null }],
      { name: "Roublard", description: "Un agile." },
    );
    const { container } = renderFor(klass);
    expect(screen.getByLabelText("Nom de la classe")).toHaveValue("Roublard");
    expect(screen.getByLabelText("Dé de vie")).toHaveValue("8");
    expect(screen.getByLabelText("Dextérité", { selector: '[name="primary_abilities.dex"]' })).toBeChecked();
    expect(field(container, "saving_throw_proficiencies.int")).toBeChecked();
    expect(field(container, "saving_throw_proficiencies.str")).not.toBeChecked();
    expect(screen.getByLabelText("Maîtrises d'outils")).toHaveValue("3 instruments de musique au choix");
    expect(field(container, "skill.Acrobaties")).toBeChecked();
    expect(field(container, "skill.Athlétisme")).not.toBeChecked();
    expect(field(container, "features.0.name")).toHaveValue("Attaque sournoise");
    expect(field(container, "features.1.level")).toHaveValue(2);
    expect(field(container, "features.2.name")).toBeNull();
    expect(field(container, "subclasses.0.name")).toHaveValue("Voleur");
    expect(field(container, "subclasses.0.available_from_level")).toHaveValue(3);
    expect(screen.getByLabelText("Description de la sous-classe (optionnelle)")).toBeInTheDocument();
  });

  it("la saisie conservée après une erreur prime sur les valeurs de l'existant", async () => {
    const { container } = render(
      <NewProposalForm
        type="feat"
        target={{ id: 4, initialValues: { content_type: "feat", title: "Costaud", description: "Fort." } }}
      />,
    );
    expect(screen.getByLabelText("Description")).toHaveValue("Fort.");
    expect(field(container, "target_id")).toHaveValue("4");
  });
});
