import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ProposalListItem } from "@/lib/proposals/types";
import { ProposalsListView } from "./ProposalsListView";

const A = "3f2b8c1e-9d4a-4b6f-8a21-0c5d7e9f1a23";
const B = "7a1c2d3e-4f50-4a6b-9c7d-8e9f0a1b2c3d";

const PROPOSALS: ProposalListItem[] = [
  {
    id: A,
    author_id: "u1",
    author_name: "Élodie",
    content_type: "spell",
    title: "Rayon de givre",
    status: "pending",
    votes_up: 3,
    votes_down: 1,
    comments_count: 2,
    created_at: "2026-09-19T10:00:00Z",
  },
  {
    id: B,
    author_id: "u2",
    author_name: null,
    content_type: "item",
    title: "Bâton étrange",
    status: "pending",
    votes_up: 1,
    votes_down: 0,
    comments_count: 1,
    created_at: "2026-09-18T10:00:00Z",
  },
];

const FILTERS = { status: "pending", type: undefined } as const;

describe("ProposalsListView", () => {
  it("affiche titre, type, statut, auteur, date et score accessible", () => {
    render(<ProposalsListView proposals={PROPOSALS} filters={FILTERS} loadError={false} />);

    const row = screen.getByRole("link", { name: /Rayon de givre/ });
    expect(row).toHaveTextContent("Sort");
    expect(row).toHaveTextContent("En attente");
    expect(row).toHaveTextContent("Élodie");
    expect(row).toHaveTextContent("19 septembre 2026");
    expect(screen.getAllByRole("img", { name: "3 votes pour" })).toHaveLength(1);
    expect(screen.getByRole("img", { name: "1 vote contre" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "2 commentaires" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "1 commentaire" })).toBeInTheDocument();
  });

  it("affiche « Membre » quand l'auteur n'a pas de nom", () => {
    render(<ProposalsListView proposals={PROPOSALS} filters={FILTERS} loadError={false} />);
    expect(screen.getByRole("link", { name: /Bâton étrange/ })).toHaveTextContent("Membre");
    expect(screen.getByRole("link", { name: /Bâton étrange/ })).toHaveTextContent("Objet");
  });

  it("conserve les filtres dans le lien du panneau et omet le statut par défaut", () => {
    render(<ProposalsListView proposals={PROPOSALS} filters={FILTERS} loadError={false} />);
    expect(screen.getByRole("link", { name: /Rayon de givre/ })).toHaveAttribute("href", `/propositions?open=${A}`);
  });

  it("garde statut et type dans le lien quand ils ne sont pas par défaut", () => {
    render(
      <ProposalsListView
        proposals={PROPOSALS}
        filters={{ status: "rejected", type: "spell" }}
        loadError={false}
      />,
    );
    const params = new URL(
      screen.getByRole("link", { name: /Rayon de givre/ }).getAttribute("href") ?? "",
      "http://x",
    ).searchParams;
    expect(params.get("statut")).toBe("rejected");
    expect(params.get("type")).toBe("spell");
    expect(params.get("open")).toBe(A);
  });

  it("met en surbrillance la proposition ouverte", () => {
    render(<ProposalsListView proposals={PROPOSALS} filters={FILTERS} loadError={false} openId={B} />);
    expect(screen.getByRole("link", { name: /Bâton étrange/ })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: /Rayon de givre/ })).not.toHaveAttribute("aria-current");
  });

  it("préremplit le formulaire de filtres", () => {
    render(
      <ProposalsListView proposals={[]} filters={{ status: "approved", type: "feat" }} loadError={false} />,
    );
    expect(screen.getByLabelText("Statut")).toHaveValue("approved");
    expect(screen.getByLabelText("Type")).toHaveValue("feat");
  });

  it("propose le bouton « Proposer du contenu »", () => {
    render(<ProposalsListView proposals={[]} filters={FILTERS} loadError={false} />);
    expect(screen.getByRole("link", { name: "Proposer du contenu" })).toHaveAttribute(
      "href",
      "/propositions/nouvelle",
    );
  });

  it("affiche un état vide selon le statut et le type", () => {
    const { rerender } = render(<ProposalsListView proposals={[]} filters={FILTERS} loadError={false} />);
    expect(screen.getByText("Aucune proposition en attente pour le moment.")).toBeInTheDocument();
    rerender(
      <ProposalsListView proposals={[]} filters={{ status: "rejected", type: "feat" }} loadError={false} />,
    );
    expect(screen.getByText("Aucune proposition refusée de ce type pour le moment.")).toBeInTheDocument();
  });

  it("affiche une erreur explicite (et pas l'état vide) quand le chargement échoue", () => {
    render(<ProposalsListView proposals={[]} filters={FILTERS} loadError={true} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Impossible de charger les propositions");
    expect(screen.queryByText(/Aucune proposition/)).not.toBeInTheDocument();
  });
});
