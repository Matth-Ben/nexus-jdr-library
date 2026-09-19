import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ProposalListItem } from "@/lib/proposals/types";
import { ProposalsListView } from "./ProposalsListView";

function item(overrides: Partial<ProposalListItem>): ProposalListItem {
  return {
    id: "3f2b8c1e-9d4a-4b6f-8a21-0c5d7e9f1a23",
    author_id: "a",
    author_name: "Élodie",
    content_type: "spell",
    target_id: null,
    title: "Boule de glace",
    status: "pending",
    votes_up: 0,
    votes_down: 0,
    comments_count: 0,
    created_at: "2026-09-19T10:00:00Z",
    ...overrides,
  };
}

describe("ProposalsListView — modifications", () => {
  it("badge « Modification » à côté du badge de type, seulement pour une modification", () => {
    render(
      <ProposalsListView
        proposals={[
          item({ id: "3f2b8c1e-9d4a-4b6f-8a21-0c5d7e9f1a01", title: "Nouvelle" }),
          item({ id: "3f2b8c1e-9d4a-4b6f-8a21-0c5d7e9f1a02", title: "Retouche", target_id: 12 }),
        ]}
        filters={{ status: "pending" }}
        loadError={false}
      />,
    );
    const [fresh, modification] = screen.getAllByRole("listitem");
    expect(within(fresh).queryByText("Modification")).not.toBeInTheDocument();
    expect(within(modification).getByText("Modification")).toBeInTheDocument();
    expect(within(modification).getByText("Sort")).toBeInTheDocument();
  });

  it("le lien ?open= reste inchangé pour une modification", () => {
    render(
      <ProposalsListView
        proposals={[item({ target_id: 12 })]}
        filters={{ status: "pending", origin: "modification" }}
        loadError={false}
      />,
    );
    expect(screen.getByRole("link", { name: /Boule de glace/ })).toHaveAttribute(
      "href",
      "/propositions?origine=modification&open=3f2b8c1e-9d4a-4b6f-8a21-0c5d7e9f1a23",
    );
  });

  it("filtre d'origine : toutes par défaut, valeur courante sélectionnée", () => {
    const { unmount } = render(<ProposalsListView proposals={[]} filters={{ status: "pending" }} loadError={false} />);
    const select = screen.getByLabelText("Origine");
    expect(select).toHaveAttribute("name", "origine");
    expect(select).toHaveValue("");
    expect(screen.getByRole("option", { name: "Nouveau contenu" })).toHaveValue("nouveau");
    expect(screen.getByRole("option", { name: "Modifications" })).toHaveValue("modification");
    unmount();

    render(<ProposalsListView proposals={[]} filters={{ status: "pending", origin: "modification" }} loadError={false} />);
    expect(screen.getByLabelText("Origine")).toHaveValue("modification");
    expect(screen.getByText("Aucune proposition en attente de cette origine pour le moment.")).toBeInTheDocument();
  });
});
