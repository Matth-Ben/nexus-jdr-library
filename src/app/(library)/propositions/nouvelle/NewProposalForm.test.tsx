import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NewProposalForm } from "./NewProposalForm";

const { createProposal } = vi.hoisted(() => ({ createProposal: vi.fn() }));
vi.mock("../actions", () => ({ createProposal }));

beforeEach(() => {
  createProposal.mockReset();
});

describe("NewProposalForm", () => {
  it("affiche les champs d'un sort", () => {
    render(<NewProposalForm type="spell" />);
    for (const label of ["Titre (sort)", "Niveau", "École", "Temps d'incantation", "Portée", "Durée", "Description"]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    for (const label of [/Verbale/, /Somatique/, /Matérielle/, /Concentration/, /Rituel/]) {
      expect(screen.getByLabelText(label)).toHaveAttribute("type", "checkbox");
    }
    expect(screen.getByLabelText("École")).toHaveValue("Abjuration");
    expect(screen.getAllByRole("option", { name: /Évocation/ })).toHaveLength(1);
  });

  it("affiche les champs d'un don", () => {
    render(<NewProposalForm type="feat" />);
    expect(screen.getByLabelText("Prérequis (optionnel)")).toBeInTheDocument();
    expect(screen.queryByLabelText("Niveau")).not.toBeInTheDocument();
  });

  it("affiche les champs d'un objet avec les libellés français des catégories", () => {
    render(<NewProposalForm type="item" />);
    expect(screen.getByRole("option", { name: "Équipement général" })).toHaveValue("equipement_general");
    expect(screen.getByRole("option", { name: "Monture/Véhicule" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Très rare" })).toHaveValue("tres_rare");
    expect(screen.getByLabelText("Coût (optionnel)")).toBeInTheDocument();
    expect(screen.getByLabelText("Devise")).toHaveValue("po");
    expect(screen.getByLabelText("Poids en kg (optionnel)")).toBeInTheDocument();
    expect(screen.getByLabelText(/Nécessite un lien/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Consommable/)).toBeInTheDocument();
  });

  it("transmet le type dans un champ caché", () => {
    const { container } = render(<NewProposalForm type="item" />);
    expect(container.querySelector("input[name=content_type]")).toHaveValue("item");
  });

  it("le formulaire ne contient aucun champ author_id ou statut", () => {
    const { container } = render(<NewProposalForm type="spell" />);
    for (const name of ["author_id", "status", "votes_up"]) {
      expect(container.querySelector(`[name=${name}]`)).toBeNull();
    }
  });
});
