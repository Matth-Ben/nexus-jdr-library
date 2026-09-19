import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NewProposalForm } from "./NewProposalForm";

const { createProposal } = vi.hoisted(() => ({ createProposal: vi.fn() }));
vi.mock("../actions", () => ({ createProposal }));

beforeEach(() => {
  createProposal.mockReset();
});

const inputValue = (container: HTMLElement, selector: string) =>
  (container.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement).value;

describe("NewProposalForm — race", () => {
  it("affiche les champs d'une race avec au moins une ligne de trait et de sous-race", () => {
    const { container } = render(<NewProposalForm type="race" />);
    expect(screen.getByLabelText("Nom de la race")).toHaveAttribute("maxlength", "80");
    expect(screen.getByLabelText("Taille")).toHaveValue("Moyenne");
    expect(screen.getByLabelText("Vitesse")).toHaveValue(30);
    expect(screen.getByLabelText("Langues")).toBeInTheDocument();
    for (const code of ["str", "dex", "con", "int", "wis", "cha"]) {
      expect(container.querySelector(`input[name='ability.${code}']`)).not.toBeNull();
      expect(container.querySelector(`input[name='subraces.0.ability.${code}']`)).not.toBeNull();
    }
    expect(container.querySelector("input[name='traits.0.name']")).not.toBeNull();
    expect(container.querySelector("textarea[name='traits.0.description']")).not.toBeNull();
    expect(container.querySelector("input[name='subraces.0.name']")).not.toBeNull();
    expect(container.querySelector("input[name='subraces.0.traits.0.name']")).not.toBeNull();
    // Pas de description générique pour une race : ses traits en tiennent lieu.
    expect(container.querySelector("textarea[name='description']")).toBeNull();
    expect(container.querySelector("input[name=content_type]")).toHaveValue("race");
  });

  it("ajoute et supprime des traits et des sous-races côté client", async () => {
    const user = userEvent.setup();
    const { container } = render(<NewProposalForm type="race" />);
    expect(screen.getByRole("button", { name: "Supprimer trait 1" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Ajouter un trait" }));
    expect(container.querySelector("input[name='traits.1.name']")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Supprimer trait 2" }));
    expect(container.querySelector("input[name='traits.1.name']")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Ajouter une sous-race" }));
    expect(container.querySelector("input[name='subraces.1.name']")).not.toBeNull();
    const second = container.querySelector("input[name='subraces.1.name']")!.closest("li") as HTMLElement;
    await user.click(within(second).getByRole("button", { name: "Ajouter un trait de la sous-race 2" }));
    expect(container.querySelector("textarea[name='subraces.1.traits.1.description']")).not.toBeNull();
    // Les traits de la première sous-race ne bougent pas.
    expect(container.querySelector("input[name='subraces.0.traits.1.name']")).toBeNull();
  });

  it("conserve toutes les lignes saisies et affiche les erreurs près du champ après un refus", async () => {
    const user = userEvent.setup();
    createProposal.mockResolvedValueOnce({
      nonce: "n1",
      errors: { "traits.1.description": "La description est obligatoire.", speed: "La vitesse est obligatoire." },
      values: {
        content_type: "race",
        title: "Faunide",
        speed: "",
        "traits.0.name": "Agilité",
        "traits.0.description": "Tu bondis.",
        "traits.1.name": "Sabots",
        "traits.1.description": "",
        "subraces.0.name": "Des bois",
        "subraces.0.traits.0.name": "Discret",
        "subraces.0.traits.0.description": "Furtif.",
        "subraces.0.traits.1.name": "Rapide",
        "subraces.0.traits.1.description": "Vite.",
      },
    });
    const { container } = render(<NewProposalForm type="race" />);
    await user.click(screen.getByRole("button", { name: "Envoyer ma proposition" }));

    expect(await screen.findByText("La vitesse est obligatoire.")).toBeInTheDocument();
    expect(inputValue(container, "input[name='title']")).toBe("Faunide");
    expect(inputValue(container, "input[name='traits.0.name']")).toBe("Agilité");
    expect(inputValue(container, "input[name='traits.1.name']")).toBe("Sabots");
    expect(inputValue(container, "input[name='subraces.0.name']")).toBe("Des bois");
    expect(inputValue(container, "input[name='subraces.0.traits.1.name']")).toBe("Rapide");
    expect(inputValue(container, "textarea[name='subraces.0.traits.1.description']")).toBe("Vite.");

    const errorNear = screen.getByText("La description est obligatoire.");
    expect(errorNear.closest("li")).toContainElement(container.querySelector("input[name='traits.1.name']"));
    expect(container.querySelector("textarea[name='traits.1.description']")).toHaveAttribute("aria-invalid", "true");
  });

  it("conserve les lignes ajoutées à la main (non vides) puis rejetées, ligne supprimée comprise", async () => {
    const user = userEvent.setup();
    // Le serveur renvoie ce qu'il a reçu : ici 3 traits, dont le 2e (rang 1) en erreur.
    createProposal.mockResolvedValueOnce({
      nonce: "n4",
      errors: { "traits.1.name": "Le nom est obligatoire." },
      values: {
        content_type: "race",
        "traits.0.name": "A",
        "traits.0.description": "a",
        "traits.1.name": "",
        "traits.1.description": "b",
        "traits.2.name": "C",
        "traits.2.description": "c",
      },
    });
    const { container } = render(<NewProposalForm type="race" />);
    await user.click(screen.getByRole("button", { name: "Envoyer ma proposition" }));
    await screen.findByText("Le nom est obligatoire.");
    expect(container.querySelectorAll("input[name^='traits.']")).toHaveLength(3);
    expect(inputValue(container, "textarea[name='traits.2.description']")).toBe("c");
  });

  it("affiche l'erreur de liste et l'erreur globale de taille", async () => {
    const user = userEvent.setup();
    createProposal.mockResolvedValueOnce({
      nonce: "n2",
      errors: {
        _form: "Le contenu est trop volumineux (61,2 Ko pour 60 Ko au maximum).",
        traits: "Ajoute au moins un trait.",
      },
      values: { content_type: "race" },
    });
    render(<NewProposalForm type="race" />);
    await user.click(screen.getByRole("button", { name: "Envoyer ma proposition" }));
    expect(await screen.findByText(/trop volumineux/)).toBeInTheDocument();
    expect(screen.getByText("Ajoute au moins un trait.")).toBeInTheDocument();
  });
});

describe("NewProposalForm — classe", () => {
  it("affiche les champs d'une classe : 18 compétences, « toutes », aptitudes et sous-classes", () => {
    const { container } = render(<NewProposalForm type="class" />);
    expect(screen.getByLabelText("Nom de la classe")).toBeInTheDocument();
    expect(screen.getByLabelText("Dé de vie")).toHaveValue("8");
    expect(screen.getByRole("option", { name: "d12" })).toHaveValue("12");
    expect(container.querySelectorAll("input[name^='skill.']")).toHaveLength(18);
    expect(screen.getByLabelText("Toutes les compétences")).toHaveAttribute("type", "checkbox");
    expect(screen.getByLabelText("Nombre de compétences à choisir")).toHaveValue(2);
    expect(container.querySelectorAll("input[name^='primary_abilities.']")).toHaveLength(6);
    expect(container.querySelectorAll("input[name^='saving_throw_proficiencies.']")).toHaveLength(6);
    expect(container.querySelector("input[name='features.0.level']")).not.toBeNull();
    expect(container.querySelector("input[name='subclasses.0.available_from_level']")).not.toBeNull();
    // Une seule description : celle de la classe.
    expect(container.querySelectorAll("textarea[name='description']")).toHaveLength(1);
    expect(container.querySelector("input[name=content_type]")).toHaveValue("class");
  });

  it("libellés français des caractéristiques (codes anglais dans les noms)", () => {
    render(<NewProposalForm type="class" />);
    const group = screen.getByRole("group", { name: /Caractéristiques principales/ });
    for (const label of ["Force", "Dextérité", "Constitution", "Intelligence", "Sagesse", "Charisme"]) {
      expect(within(group).getByLabelText(label)).toBeInTheDocument();
    }
  });

  it("conserve compétences cochées, aptitudes et sous-classes après un refus", async () => {
    const user = userEvent.setup();
    createProposal.mockResolvedValueOnce({
      nonce: "n3",
      errors: { "features.1.level": "Le niveau est obligatoire.", skill_choices: "Coche au moins 2 compétences." },
      values: {
        content_type: "class",
        title: "Chevalier",
        description: "Desc",
        hit_die: "12",
        "primary_abilities.dex": "on",
        skill_all: "on",
        "skill.Arcanes": "on",
        "features.0.level": "1",
        "features.0.name": "A",
        "features.0.description": "a",
        "features.1.level": "",
        "features.1.name": "B",
        "features.1.description": "b",
        "subclasses.0.name": "Voie",
        "subclasses.0.available_from_level": "3",
        "subclasses.0.description": "v",
      },
    });
    const { container } = render(<NewProposalForm type="class" />);
    await user.click(screen.getByRole("button", { name: "Envoyer ma proposition" }));
    expect(await screen.findByText("Coche au moins 2 compétences.")).toBeInTheDocument();
    expect(screen.getByLabelText("Dé de vie")).toHaveValue("12");
    expect(container.querySelector("input[name='primary_abilities.dex']")).toBeChecked();
    expect(container.querySelector("input[name='primary_abilities.str']")).not.toBeChecked();
    expect(screen.getByLabelText("Toutes les compétences")).toBeChecked();
    expect(container.querySelector("input[name='skill.Arcanes']")).toBeChecked();
    expect(container.querySelector("input[name='skill.Survie']")).not.toBeChecked();
    expect(inputValue(container, "input[name='features.1.name']")).toBe("B");
    expect(screen.getByText("Le niveau est obligatoire.").closest("li")).toContainElement(
      container.querySelector("input[name='features.1.name']"),
    );
    expect(inputValue(container, "input[name='subclasses.0.available_from_level']")).toBe("3");
  });
});
