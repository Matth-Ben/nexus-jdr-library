import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ProposalComment, ProposalDetail } from "@/lib/proposals/types";
import { ProposalDetailView, type ProposalDetailViewProps } from "./ProposalDetailView";

vi.mock("./actions", () => ({
  castVote: vi.fn(),
  addComment: vi.fn(),
  deleteComment: vi.fn(),
  deleteProposal: vi.fn(),
  reviewProposal: vi.fn(),
}));

const ID = "3f2b8c1e-9d4a-4b6f-8a21-0c5d7e9f1a23";

const PROPOSAL: ProposalDetail = {
  id: ID,
  author_id: "author",
  author_name: "Élodie",
  content_type: "feat",
  title: "Chanceux",
  status: "pending",
  votes_up: 2,
  votes_down: 0,
  comments_count: 1,
  created_at: "2026-09-19T10:00:00Z",
  payload: { description: "Relance un dé <b>par jour</b>.", prerequisite: "Force 13" },
  rejection_reason: null,
  reviewed_at: null,
};

const COMMENTS: ProposalComment[] = [
  {
    id: "c1",
    proposal_id: ID,
    author_id: "voter",
    author_name: null,
    body: "Bonne idée.",
    created_at: "2026-09-19T11:00:00Z",
  },
  {
    id: "c2",
    proposal_id: ID,
    author_id: "other",
    author_name: "Marc",
    body: "Trop fort ?",
    created_at: "2026-09-19T12:00:00Z",
  },
];

function renderView(overrides: Partial<ProposalDetailViewProps> = {}) {
  return render(
    <ProposalDetailView
      proposal={PROPOSAL}
      comments={COMMENTS}
      userId="voter"
      userVote={null}
      isAdmin={false}
      returnTo={`/propositions?open=${ID}`}
      closeHref="/propositions"
      {...overrides}
    />,
  );
}

describe("ProposalDetailView", () => {
  it("affiche le contenu du payload et échappe le HTML de la description", () => {
    renderView();
    expect(screen.getByRole("heading", { level: 1, name: "Chanceux" })).toBeInTheDocument();
    expect(screen.getByText("Force 13")).toBeInTheDocument();
    expect(screen.getByText("Relance un dé <b>par jour</b>.")).toBeInTheDocument();
    expect(document.querySelector("b")).toBeNull();
    expect(screen.getByText(/Proposé par Élodie le 19 septembre 2026/)).toBeInTheDocument();
  });

  it("liste les commentaires dans l'ordre reçu, « Membre » sans nom", () => {
    renderView();
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Membre");
    expect(items[0]).toHaveTextContent("Bonne idée.");
    expect(items[1]).toHaveTextContent("Marc");
  });

  it("n'offre « Supprimer » que sur ses propres commentaires", () => {
    renderView();
    const items = screen.getAllByRole("listitem");
    expect(within(items[0]).getByRole("button", { name: "Supprimer" })).toBeInTheDocument();
    expect(within(items[1]).queryByRole("button", { name: "Supprimer" })).not.toBeInTheDocument();
  });

  it("offre « Supprimer » sur tous les commentaires à un admin", () => {
    renderView({ isAdmin: true });
    expect(screen.getAllByRole("button", { name: "Supprimer" })).toHaveLength(2);
  });

  it("visiteur : pas de suppression, pas de formulaire, liens de connexion", () => {
    renderView({ userId: null });
    expect(screen.queryByRole("button", { name: "Supprimer" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Publier" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Connecte-toi pour commenter" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Connecte-toi pour voter" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retirer ma proposition" })).not.toBeInTheDocument();
  });

  it("membre connecté : formulaire de commentaire avec compteur", async () => {
    renderView();
    expect(screen.getByText("0 / 2000")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Ajouter un commentaire"), "Salut");
    expect(screen.getByText("5 / 2000")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publier" })).toBeEnabled();
  });

  it("l'auteur voit « Retirer ma proposition » avec confirmation en deux temps", async () => {
    renderView({ userId: "author" });
    await userEvent.click(screen.getByRole("button", { name: "Retirer ma proposition" }));
    expect(screen.getByRole("button", { name: "Oui, la retirer" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.queryByRole("button", { name: "Oui, la retirer" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retirer ma proposition" })).toBeInTheDocument();
  });

  it("pas de bouton de retrait pour l'auteur quand la proposition n'est plus en attente", () => {
    renderView({ userId: "author", proposal: { ...PROPOSAL, status: "approved" } });
    expect(screen.queryByRole("button", { name: "Retirer ma proposition" })).not.toBeInTheDocument();
  });

  it("le bloc admin n'apparaît que pour un admin et une proposition en attente", () => {
    const { unmount } = renderView();
    expect(screen.queryByRole("button", { name: "Approuver" })).not.toBeInTheDocument();
    unmount();

    const admin = renderView({ isAdmin: true });
    expect(screen.getByRole("button", { name: "Approuver" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refuser" })).toBeInTheDocument();
    expect(screen.getByLabelText("Motif du refus (optionnel)")).toBeInTheDocument();
    admin.unmount();

    renderView({ isAdmin: true, proposal: { ...PROPOSAL, status: "approved" } });
    expect(screen.queryByRole("button", { name: "Approuver" })).not.toBeInTheDocument();
  });

  it("affiche le motif d'un refus", () => {
    renderView({
      proposal: {
        ...PROPOSAL,
        status: "rejected",
        rejection_reason: "Trop proche du contenu officiel.",
        reviewed_at: "2026-09-20T08:00:00Z",
      },
    });
    expect(screen.getByRole("note")).toHaveTextContent("Proposition refusée le 20 septembre 2026.");
    expect(screen.getByRole("note")).toHaveTextContent("Motif : Trop proche du contenu officiel.");
  });

  it("n'affiche aucun motif pour une proposition en attente ou refusée sans motif", () => {
    const { unmount } = renderView();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    unmount();
    renderView({ proposal: { ...PROPOSAL, status: "rejected" } });
    expect(screen.getByRole("note")).not.toHaveTextContent("Motif");
  });

  it("supporte un payload illisible sans planter", () => {
    renderView({ proposal: { ...PROPOSAL, payload: "n'importe quoi" } });
    expect(screen.getByText("Aucun")).toBeInTheDocument();
  });

  it("indique l'absence de commentaire", () => {
    renderView({ comments: [] });
    expect(screen.getByText("Aucun commentaire pour le moment.")).toBeInTheDocument();
  });
});
