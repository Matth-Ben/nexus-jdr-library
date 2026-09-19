import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { buildFeatContent, buildRaceContent } from "@/lib/proposals/existing";
import type { ProposalDetail } from "@/lib/proposals/types";
import { ProposalDetailView, type ProposalDetailViewProps } from "./ProposalDetailView";

vi.mock("./actions", () => ({
  castVote: vi.fn(),
  addComment: vi.fn(),
  deleteComment: vi.fn(),
  deleteProposal: vi.fn(),
  reviewProposal: vi.fn(),
}));

const ID = "3f2b8c1e-9d4a-4b6f-8a21-0c5d7e9f1a23";

function proposal(overrides: Partial<ProposalDetail>): ProposalDetail {
  return {
    id: ID,
    author_id: "author",
    author_name: "Élodie",
    content_type: "feat",
    target_id: 4,
    title: "Costaud",
    status: "pending",
    votes_up: 0,
    votes_down: 0,
    comments_count: 0,
    created_at: "2026-09-19T10:00:00Z",
    payload: { description: "Très fort.", prerequisite: "Force 15" },
    rejection_reason: null,
    reviewed_at: null,
    ...overrides,
  };
}

function renderView(props: Partial<ProposalDetailViewProps> & { proposal: ProposalDetail }) {
  return render(
    <ProposalDetailView
      comments={[]}
      userId="voter"
      userVote={null}
      isAdmin={false}
      returnTo={`/propositions?open=${ID}`}
      closeHref="/propositions"
      {...props}
    />,
  );
}

const FEAT = buildFeatContent(4, { prerequisites: { text: "Force 13" } }, { name: "Costaud", description: "Fort." });

describe("ProposalDetailView — proposition de modification", () => {
  it("affiche le badge, l'en-tête avec lien vers la fiche et le bloc « Ce qui change »", () => {
    renderView({ proposal: proposal({}), target: { status: "found", existing: FEAT } });
    expect(screen.getByText("Modification")).toBeInTheDocument();
    expect(screen.getByText(/Modification de/)).toHaveTextContent("Modification de « Costaud »");
    expect(screen.getByRole("link", { name: "voir la fiche actuelle" })).toHaveAttribute("href", "/dons?open=4");

    const changes = screen.getByRole("region", { name: "Ce qui change" });
    expect(within(changes).getByText("Prérequis")).toBeInTheDocument();
    expect(changes).toHaveTextContent("Force 13");
    expect(changes).toHaveTextContent("Force 15");
    expect(changes).toHaveTextContent("Description");
    expect(changes).toHaveTextContent("Fort.");
    expect(changes).toHaveTextContent("Très fort.");
  });

  it("montre la version proposée complète et marque discrètement les champs modifiés", () => {
    renderView({ proposal: proposal({}), target: { status: "found", existing: FEAT } });
    expect(screen.getByText("Force 15", { selector: "dd" })).toBeInTheDocument();
    const row = screen.getByText("Force 15", { selector: "dd" }).parentElement as HTMLElement;
    expect(within(row).getByText("modifié")).toBeInTheDocument();
    expect(screen.getByText("modifiée")).toBeInTheDocument();
  });

  it("renommage : « avant → après » sur le titre", () => {
    renderView({
      proposal: proposal({ title: "Très costaud", payload: { description: "Fort.", prerequisite: "Force 13" } }),
      target: { status: "found", existing: FEAT },
    });
    const changes = screen.getByRole("region", { name: "Ce qui change" });
    expect(changes).toHaveTextContent("Titre : Costaud → Très costaud");
    expect(screen.queryByText("modifiée")).not.toBeInTheDocument();
  });

  it("listes : éléments ajoutés, retirés et modifiés, marqués dans la version proposée", () => {
    const race = buildRaceContent(
      2,
      {
        size: "Moyenne",
        speed: 9,
        ability_bonuses: { dex: 2 },
        languages: ["Commun"],
        traits: [
          { name: "Vision", description: "Tu vois." },
          { name: "Transe", description: "Tu médites." },
        ],
      },
      [],
      { name: "Elfe" },
    );
    renderView({
      proposal: proposal({
        content_type: "race",
        target_id: 2,
        title: "Elfe",
        payload: {
          size: "Moyenne",
          speed: 9,
          ability_bonuses: { dex: 2 },
          languages: ["Commun", "Nain"],
          traits: [
            { name: "Vision", description: "Tu vois mieux." },
            { name: "Sens", description: "Perception." },
          ],
          subraces: [],
        },
      }),
      target: { status: "found", existing: race },
    });
    const changes = screen.getByRole("region", { name: "Ce qui change" });
    expect(changes).toHaveTextContent("Langues — ajouté : Nain");
    expect(changes).toHaveTextContent("Traits — ajouté : Sens ; retiré : Transe ; modifié : Vision");
    // Seuls les éléments ajoutés ou modifiés sont marqués dans la version proposée.
    expect(screen.getAllByText("ajouté").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("modifié").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("link", { name: "voir la fiche actuelle" })).toHaveAttribute("href", "/races?open=2");
  });

  it("cible disparue : avis discret, pas de bloc « Ce qui change », version proposée toujours affichée", () => {
    renderView({ proposal: proposal({}), target: { status: "missing" } });
    expect(screen.getByRole("note")).toHaveTextContent("n'existe plus dans la bibliothèque");
    expect(screen.queryByRole("region", { name: "Ce qui change" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "voir la fiche actuelle" })).not.toBeInTheDocument();
    expect(screen.getByText("Force 15")).toBeInTheDocument();
    expect(screen.getByText(/Modification d'un élément de la bibliothèque \(n° 4\)/)).toBeInTheDocument();
  });

  it("chargement de la cible impossible : avis, pas de plantage", () => {
    renderView({ proposal: proposal({}), target: { status: "error" } });
    expect(screen.getByRole("note")).toHaveTextContent("Impossible de charger la version actuelle");
    renderView({ proposal: proposal({}) });
    expect(screen.getAllByRole("note")).toHaveLength(2);
  });

  it("existant modifié depuis : la proposition devenue identique le dit", () => {
    renderView({
      proposal: proposal({ payload: { description: "Fort.", prerequisite: "Force 13" } }),
      target: { status: "found", existing: FEAT },
    });
    expect(screen.getByRole("region", { name: "Ce qui change" })).toHaveTextContent("Aucune différence avec la version actuelle");
  });

  it("payload malformé : rendu sans plantage", () => {
    renderView({ proposal: proposal({ payload: "n'importe quoi" }), target: { status: "found", existing: FEAT } });
    expect(screen.getByRole("region", { name: "Ce qui change" })).toBeInTheDocument();
    renderView({ proposal: proposal({ content_type: "class", payload: { features: 12, subclasses: "x" } }), target: { status: "found", existing: FEAT } });
    expect(screen.getAllByRole("region", { name: "Ce qui change" })).toHaveLength(2);
  });

  it("une proposition de nouveau contenu n'affiche ni badge, ni en-tête, ni diff", () => {
    renderView({ proposal: proposal({ target_id: null }) });
    expect(screen.queryByText("Modification")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Ce qui change" })).not.toBeInTheDocument();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("votes, commentaires et décision admin restent inchangés", () => {
    renderView({ proposal: proposal({}), target: { status: "found", existing: FEAT }, isAdmin: true });
    expect(screen.getByRole("region", { name: "Avis" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Commentaires" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approuver" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refuser" })).toBeInTheDocument();
  });
});
