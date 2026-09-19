import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VoteControls, type VoteControlsProps } from "./VoteControls";

vi.mock("./actions", () => ({ castVote: vi.fn() }));

const ID = "3f2b8c1e-9d4a-4b6f-8a21-0c5d7e9f1a23";

function renderControls(overrides: Partial<VoteControlsProps> = {}) {
  return render(
    <VoteControls
      proposalId={ID}
      authorId="author"
      status="pending"
      votesUp={4}
      votesDown={2}
      userId="voter"
      userVote={null}
      returnTo={`/propositions?statut=pending&open=${ID}`}
      {...overrides}
    />,
  );
}

const upButton = () => screen.getByRole("button", { name: /^Pour/ });
const downButton = () => screen.getByRole("button", { name: /^Contre/ });

describe("VoteControls", () => {
  it("membre connecté sur une proposition en attente : boutons actifs avec compteurs", () => {
    renderControls();
    expect(upButton()).toBeEnabled();
    expect(downButton()).toBeEnabled();
    expect(upButton()).toHaveTextContent("4");
    expect(downButton()).toHaveTextContent("2");
    expect(upButton()).toHaveAttribute("aria-pressed", "false");
    expect(downButton()).toHaveAttribute("aria-pressed", "false");
  });

  it("marque le vote actif de l'utilisateur (aria-pressed) et indique qu'on peut le retirer", () => {
    renderControls({ userVote: "down" });
    expect(downButton()).toHaveAttribute("aria-pressed", "true");
    expect(downButton()).toHaveAccessibleName(/retirer/);
    expect(upButton()).toHaveAttribute("aria-pressed", "false");
    expect(upButton()).toBeEnabled();
  });

  it("envoie proposition et retour dans des champs cachés, jamais l'identifiant de l'utilisateur", () => {
    const { container } = renderControls();
    const names = Array.from(container.querySelectorAll("input[type=hidden]")).map((input) =>
      input.getAttribute("name"),
    );
    expect(names.sort()).toEqual(["next", "proposal_id"]);
    expect(upButton()).toHaveAttribute("value", "up");
    expect(downButton()).toHaveAttribute("value", "down");
  });

  it("visiteur non connecté : boutons désactivés et lien de connexion avec retour", () => {
    renderControls({ userId: null });
    expect(upButton()).toBeDisabled();
    expect(downButton()).toBeDisabled();
    const link = screen.getByRole("link", { name: "Connecte-toi pour voter" });
    const href = link.getAttribute("href") ?? "";
    expect(href.startsWith("/connexion?next=")).toBe(true);
    expect(decodeURIComponent(href.split("next=")[1])).toBe(`/propositions?statut=pending&open=${ID}`);
  });

  it("auteur : boutons désactivés avec explication", () => {
    renderControls({ userId: "author" });
    expect(upButton()).toBeDisabled();
    expect(downButton()).toBeDisabled();
    expect(screen.getByText("Tu ne peux pas voter pour ta propre proposition.")).toBeInTheDocument();
  });

  it.each(["approved", "rejected"] as const)("proposition %s : boutons désactivés avec explication", (status) => {
    renderControls({ status });
    expect(upButton()).toBeDisabled();
    expect(downButton()).toBeDisabled();
    expect(screen.getByText(/Les votes sont clos/)).toBeInTheDocument();
  });

  it("garde l'état actif visible même quand le vote est clos", () => {
    renderControls({ status: "approved", userVote: "up" });
    expect(upButton()).toHaveAttribute("aria-pressed", "true");
    expect(upButton()).toBeDisabled();
  });

  it("n'affiche pas de lien de connexion à un membre connecté", () => {
    renderControls();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
