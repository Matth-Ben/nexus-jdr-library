import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ProposalDetail } from "@/lib/proposals/types";
import { ProposalDetailView } from "./ProposalDetailView";
import { ProposalsListView } from "./ProposalsListView";

vi.mock("./actions", () => ({
  castVote: vi.fn(),
  addComment: vi.fn(),
  deleteComment: vi.fn(),
  deleteProposal: vi.fn(),
  reviewProposal: vi.fn(),
}));

const ID = "3f2b8c1e-9d4a-4b6f-8a21-0c5d7e9f1a23";

function proposal(content_type: "race" | "class", payload: unknown, title = "Titre"): ProposalDetail {
  return {
    id: ID,
    author_id: "author",
    author_name: "Élodie",
    content_type,
    title,
    status: "pending",
    votes_up: 0,
    votes_down: 0,
    comments_count: 0,
    created_at: "2026-09-19T10:00:00Z",
    payload,
    rejection_reason: null,
    reviewed_at: null,
  };
}

function view(p: ProposalDetail) {
  return render(
    <ProposalDetailView
      proposal={p}
      comments={[]}
      userId="voter"
      userVote={null}
      isAdmin={false}
      returnTo={`/propositions?open=${ID}`}
      closeHref="/propositions"
    />,
  );
}

const RACE = {
  size: "Petite",
  speed: 25,
  ability_bonuses: { dex: 2 },
  languages: ["Commun", "Gnome"],
  traits: [{ name: "Vision dans le noir", description: "Tu vois dans le noir." }],
  subraces: [
    {
      name: "Gnome des roches",
      ability_bonuses: { con: 1 },
      traits: [{ name: "Bricoleur", description: "Tu répares." }],
    },
  ],
};

const CLASS = {
  description: "Un guerrier <script>alert(1)</script>.",
  hit_die: 12,
  primary_abilities: ["str"],
  saving_throw_proficiencies: ["str", "con"],
  armor_proficiencies: ["toutes"],
  weapon_proficiencies: [],
  tool_proficiencies: ["outils de forgeron"],
  skill_choices: { count: 2, choices: "toutes" },
  features: [
    { level: 3, name: "Archétype", description: "Choisis." },
    { level: 1, name: "Second souffle", description: "Tu récupères." },
  ],
  subclasses: [{ name: "Champion", available_from_level: 3, description: "Critiques." }],
};

describe("ProposalDetailView — race", () => {
  it("rend taille, vitesse, bonus, langues, traits et sous-races repliables", () => {
    view(proposal("race", RACE, "Gnome"));
    expect(screen.getByRole("heading", { level: 1, name: "Gnome" })).toBeInTheDocument();
    expect(screen.getByText("Race")).toBeInTheDocument();
    expect(screen.getByText("Petite")).toBeInTheDocument();
    expect(screen.getByText("25 m")).toBeInTheDocument();
    expect(screen.getByText("DEX +2")).toBeInTheDocument();
    expect(screen.getByText("Commun, Gnome")).toBeInTheDocument();

    expect(screen.getByRole("heading", { level: 2, name: "Traits" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Vision dans le noir" })).toBeInTheDocument();
    expect(screen.getByText("Tu vois dans le noir.")).toBeInTheDocument();

    expect(screen.getByRole("heading", { level: 2, name: "Sous-races" })).toBeInTheDocument();
    const details = document.querySelector("details") as HTMLElement;
    expect(details).not.toHaveAttribute("open");
    expect(within(details).getByText("Gnome des roches")).toBeInTheDocument();
    expect(within(details).getByText("CON +1")).toBeInTheDocument();
    expect(within(details).getByText("Bricoleur")).toBeInTheDocument();
    expect(within(details).getByText("Tu répares.")).toBeInTheDocument();
  });

  it("échappe le texte utilisateur, sans jamais injecter de HTML", () => {
    const { container } = view(
      proposal("race", {
        ...RACE,
        traits: [{ name: "<img src=x onerror=alert(1)>", description: "<script>alert(1)</script>" }],
        languages: ["<b>Gras</b>"],
      }),
    );
    expect(container.querySelector("img, script, b")).toBeNull();
    expect(screen.getByText("<script>alert(1)</script>")).toBeInTheDocument();
    expect(screen.getByText("<b>Gras</b>")).toBeInTheDocument();
  });

  it.each([null, "n'importe quoi", 12, [], { traits: "x", subraces: 3, speed: "vite", ability_bonuses: [1] }])(
    "payload malformé %j : pas de crash, repli lisible, commentaires et vote intacts",
    (payload) => {
      view(proposal("race", payload));
      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
      expect(screen.getAllByText("(non renseigné)").length).toBeGreaterThan(0);
      expect(screen.getByRole("heading", { level: 2, name: /Commentaires/ })).toBeInTheDocument();
    },
  );
});

describe("ProposalDetailView — classe", () => {
  it("rend description, dé de vie, caractéristiques, maîtrises et choix de compétences", () => {
    const { container } = view(proposal("class", CLASS, "Guerrier"));
    expect(screen.getByText("Classe")).toBeInTheDocument();
    expect(screen.getByText("d12")).toBeInTheDocument();
    expect(screen.getByText("Force")).toBeInTheDocument();
    expect(screen.getByText("Force, Constitution")).toBeInTheDocument();
    expect(screen.getByText("toutes")).toBeInTheDocument();
    expect(screen.getByText("outils de forgeron")).toBeInTheDocument();
    expect(screen.getByText("Choisissez 2 compétences parmi toutes les compétences")).toBeInTheDocument();
    // La description est du texte, pas du HTML.
    expect(screen.getByText("Un guerrier <script>alert(1)</script>.")).toBeInTheDocument();
    expect(container.querySelector("script")).toBeNull();
  });

  it("groupe et trie les aptitudes par niveau, puis liste les sous-classes avec leur niveau", () => {
    view(proposal("class", CLASS));
    const headings = screen.getAllByRole("heading").map((heading) => heading.textContent);
    expect(headings.indexOf("Niveau 1")).toBeGreaterThan(headings.indexOf("Aptitudes de classe"));
    expect(headings.indexOf("Niveau 1")).toBeLessThan(headings.indexOf("Niveau 3"));
    expect(headings.indexOf("Second souffle")).toBeLessThan(headings.indexOf("Archétype"));
    expect(screen.getByRole("heading", { level: 2, name: "Sous-classes" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Champion/ })).toHaveTextContent("Champion — Niveau 3");
    expect(screen.getByText("Critiques.")).toBeInTheDocument();
  });

  it.each([null, "x", 3, [], { features: "x", subclasses: [null, 4], skill_choices: 7, primary_abilities: "str" }])(
    "payload malformé %j : pas de crash",
    (payload) => {
      view(proposal("class", payload));
      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
      expect(screen.getAllByText("(non renseigné)").length).toBeGreaterThan(0);
    },
  );
});

describe("ProposalsListView — race et classe", () => {
  it("propose Race et Classe dans le filtre de type et affiche le badge", () => {
    render(
      <ProposalsListView
        proposals={[
          {
            id: ID,
            author_id: "u",
            author_name: null,
            content_type: "class",
            title: "Barde noir",
            status: "pending",
            votes_up: 0,
            votes_down: 0,
            comments_count: 0,
            created_at: "2026-09-19T10:00:00Z",
          },
        ]}
        filters={{ status: "pending", type: "class" }}
        loadError={false}
      />,
    );
    expect(screen.getByRole("option", { name: "Race" })).toHaveValue("race");
    expect(screen.getByRole("option", { name: "Classe" })).toHaveValue("class");
    expect(screen.getByLabelText("Type")).toHaveValue("class");
    const row = screen.getByRole("link", { name: /Barde noir/ });
    expect(within(row).getByText("Classe")).toBeInTheDocument();
  });
});
